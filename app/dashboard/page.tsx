import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { sql } from "@/lib/db";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const users = await sql`
    SELECT id
    FROM users
    WHERE email = ${session.user.email}
    LIMIT 1
  `;

  const user = users[0];

  if (!user?.id) {
    redirect("/login");
  }

  const tables = await sql`
    SELECT
      to_regclass('public.accounts')::text AS accounts_table,
      to_regclass('public.transactions')::text AS transactions_table
  `;

  const tableInfo = tables[0] as
    | {
        accounts_table: string | null;
        transactions_table: string | null;
      }
    | undefined;

  const hasAccountsTable = Boolean(tableInfo?.accounts_table);
  const hasTransactionsTable = Boolean(tableInfo?.transactions_table);
  const accounts = hasAccountsTable ? await sql`SELECT * FROM accounts WHERE user_id = ${user.id}` : [];
  const transactions = hasTransactionsTable
    ? await sql`SELECT * FROM transactions WHERE user_id = ${user.id} ORDER BY date DESC LIMIT 10`
    : [];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Welcome, {session.user?.name || session.user?.email}</h1>
      {!hasAccountsTable || !hasTransactionsTable ? (
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Your account is authenticated, but portfolio data is not fully available in this environment yet.
        </div>
      ) : null}
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Accounts</h2>
          {accounts.map(acc => (
            <div key={acc.id} className="border-t mt-2 pt-2">
              <p>{acc.account_type} - ${Number(acc.balance).toLocaleString()}</p>
              <p className="text-sm text-gray-500">#{acc.account_number}</p>
            </div>
          ))}
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          {transactions.length === 0 ? <p>No transactions yet.</p> : (
            <ul>
              {transactions.map(tx => (
                <li key={tx.id} className="border-b py-2">
                  {new Date(tx.date).toLocaleDateString()} - {tx.description} - ${Number(tx.amount).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
