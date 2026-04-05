import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hashedPassword = await bcrypt.hash("password123", 10);

  try {
    const seededUsers = await sql`
      INSERT INTO users (email, password, name)
      VALUES ('demo@evestime.com', ${hashedPassword}, 'Demo User')
      ON CONFLICT (email)
      DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name
      RETURNING id, email, name
    `;

    const user = seededUsers[0];
    const warnings: string[] = [];

    try {
      await sql`
        INSERT INTO accounts (user_id, account_type, balance, account_number)
        VALUES
          (${user.id}, 'Checking', 2450.75, '1002003001'),
          (${user.id}, 'Savings', 10240.5, '1002003002')
        ON CONFLICT (account_number)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          account_type = EXCLUDED.account_type,
          balance = EXCLUDED.balance
      `;
    } catch (error) {
      warnings.push(
        `Account seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      const existingTransactions = await sql`
        SELECT COUNT(*)::int AS count
        FROM transactions
        WHERE user_id = ${user.id}
      `;

      if ((existingTransactions[0]?.count ?? 0) === 0) {
        await sql`
          INSERT INTO transactions (user_id, description, amount, date)
          VALUES
            (${user.id}, 'Opening deposit', 5000.00, NOW() - INTERVAL '14 days'),
            (${user.id}, 'Electricity bill', -120.50, NOW() - INTERVAL '5 days'),
            (${user.id}, 'Payroll deposit', 2350.75, NOW() - INTERVAL '1 day')
        `;
      }
    } catch (error) {
      warnings.push(
        `Transaction seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      password: "password123",
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
