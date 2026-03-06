import { NextRequest } from "next/server";
import { db } from "@/db";
import { casinoBets } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api-utils";
import { deductKarma, addKarma, getKarma } from "@/lib/karma";

const VALID_GAMES = ["coin_flip", "roulette", "slots"] as const;
type Game = (typeof VALID_GAMES)[number];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "🎰"];

function playCoinFlip(betChoice: string, betAmount: number): { result: string; payout: number } | string {
  if (betChoice !== "heads" && betChoice !== "tails") {
    return "bet_choice must be 'heads' or 'tails' for coin_flip";
  }
  const result = Math.random() < 0.5 ? "heads" : "tails";
  const payout = result === betChoice ? betAmount * 2 : 0;
  return { result, payout };
}

function playRoulette(betChoice: string, betAmount: number): { result: string; payout: number } | string {
  const validChoices = ["red", "black", "odd", "even", "1-18", "19-36"];
  const isNumber = /^\d+$/.test(betChoice) && parseInt(betChoice) >= 0 && parseInt(betChoice) <= 36;

  if (!isNumber && !validChoices.includes(betChoice)) {
    return "bet_choice must be a number '0'-'36', 'red', 'black', 'odd', 'even', '1-18', or '19-36' for roulette";
  }

  const spin = Math.floor(Math.random() * 37); // 0-36
  const result = String(spin);
  let payout = 0;

  if (isNumber) {
    if (parseInt(betChoice) === spin) {
      payout = betAmount * 35;
    }
  } else if (betChoice === "red") {
    if (spin !== 0 && RED_NUMBERS.has(spin)) payout = betAmount * 2;
  } else if (betChoice === "black") {
    if (spin !== 0 && !RED_NUMBERS.has(spin)) payout = betAmount * 2;
  } else if (betChoice === "odd") {
    if (spin !== 0 && spin % 2 === 1) payout = betAmount * 2;
  } else if (betChoice === "even") {
    if (spin !== 0 && spin % 2 === 0) payout = betAmount * 2;
  } else if (betChoice === "1-18") {
    if (spin >= 1 && spin <= 18) payout = betAmount * 2;
  } else if (betChoice === "19-36") {
    if (spin >= 19 && spin <= 36) payout = betAmount * 2;
  }

  return { result, payout };
}

function playSlots(betChoice: string, betAmount: number): { result: string; payout: number } | string {
  if (betChoice !== "spin") {
    return "bet_choice must be 'spin' for slots";
  }

  const s1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  const s2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  const s3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  const result = `${s1}${s2}${s3}`;

  let payout = 0;

  if (s1 === s2 && s2 === s3) {
    // All 3 match
    if (s1 === "7️⃣") {
      payout = betAmount * 50; // JACKPOT
    } else if (s1 === "💎") {
      payout = betAmount * 25;
    } else {
      payout = betAmount * 10;
    }
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    // 2 match
    payout = betAmount * 2;
  }

  return { result, payout };
}

export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  let body: { game?: string; bet_amount?: number; bet_choice?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { game, bet_amount, bet_choice } = body;

  if (!game || !VALID_GAMES.includes(game as Game)) {
    return error(`Invalid game. Must be one of: ${VALID_GAMES.join(", ")}`);
  }
  if (typeof bet_amount !== "number" || bet_amount < 1 || !Number.isInteger(bet_amount)) {
    return error("bet_amount must be a positive integer >= 1");
  }
  if (!bet_choice || typeof bet_choice !== "string") {
    return error("bet_choice is required");
  }

  // Deduct karma first (returns false if insufficient)
  const deducted = await deductKarma(agent.id, bet_amount);
  if (!deducted) {
    return error("Insufficient karma", 400);
  }

  // Play the game
  let outcome: { result: string; payout: number } | string;

  if (game === "coin_flip") {
    outcome = playCoinFlip(bet_choice, bet_amount);
  } else if (game === "roulette") {
    outcome = playRoulette(bet_choice, bet_amount);
  } else {
    outcome = playSlots(bet_choice, bet_amount);
  }

  // If outcome is a string, it's a validation error - refund karma
  if (typeof outcome === "string") {
    await addKarma(agent.id, bet_amount);
    return error(outcome);
  }

  const { result, payout } = outcome;

  // Add winnings if any
  if (payout > 0) {
    await addKarma(agent.id, payout);
  }

  // Save bet to DB
  await db.insert(casinoBets).values({
    agentId: agent.id,
    game: game as Game,
    betAmount: bet_amount,
    betChoice: bet_choice,
    result,
    payout,
  });

  const newKarma = await getKarma(agent.id);

  return json({
    game,
    bet_amount,
    bet_choice,
    result,
    payout,
    won: payout > 0,
    new_karma: newKarma,
  });
}
