import { useSQLiteContext } from "expo-sqlite";
import type { Frequency } from "../domain/money";
import type { ScheduleRule } from "../domain/schedule";

export type SettingsRow = {
  currency: string;
  base_frequency: Frequency;
  starting_balance: number;
};

export type IncomeRow = {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
  rule_json: string;
  enabled: number;
};

export type ExpenseRow = {
  id: number;
  name: string;
  category: string;
  amount: number;
  frequency: Frequency;
  rule_json: string;
  enabled: number;
};

export type FlowRow = {
  id: number;
  flow_type: string;
  name: string;
  amount: number;
  frequency: Frequency;
  rule_json: string;
  goal_target: number | null;
  enabled: number;
};

export function useRepo() {
  const db = useSQLiteContext();

  return {
    // SETTINGS
    async getSettings(): Promise<SettingsRow> {
      const row = await db.getFirstAsync<SettingsRow>(
        "SELECT currency, base_frequency, starting_balance FROM settings WHERE id = 1"
      );
      return row ?? { currency: "EUR", base_frequency: "monthly", starting_balance: 0 };
    },

    async updateSettings(patch: Partial<SettingsRow>) {
      const current = await this.getSettings();
      const next = { ...current, ...patch };
      await db.runAsync(
        "UPDATE settings SET currency = ?, base_frequency = ?, starting_balance = ? WHERE id = 1",
        next.currency,
        next.base_frequency,
        next.starting_balance
      );
    },

    // INCOME
    async listIncome(): Promise<IncomeRow[]> {
      return await db.getAllAsync<IncomeRow>("SELECT * FROM income_sources ORDER BY id DESC");
    },

    async upsertIncome(input: {
      id?: number;
      name: string;
      amount: number;
      frequency: Frequency;
      rule: ScheduleRule;
      enabled: boolean;
    }) {
      const rule_json = JSON.stringify(input.rule);
      const enabled = input.enabled ? 1 : 0;

      if (input.id) {
        await db.runAsync(
          "UPDATE income_sources SET name=?, amount=?, frequency=?, rule_json=?, enabled=? WHERE id=?",
          input.name,
          input.amount,
          input.frequency,
          rule_json,
          enabled,
          input.id
        );
      } else {
        await db.runAsync(
          "INSERT INTO income_sources (name, amount, frequency, rule_json, enabled) VALUES (?, ?, ?, ?, ?)",
          input.name,
          input.amount,
          input.frequency,
          rule_json,
          enabled
        );
      }
    },

    async deleteIncome(id: number) {
      await db.runAsync("DELETE FROM income_sources WHERE id = ?", id);
    },

    // EXPENSES
    async listExpenses(): Promise<ExpenseRow[]> {
      return await db.getAllAsync<ExpenseRow>("SELECT * FROM expenses ORDER BY id DESC");
    },

    async upsertExpense(input: {
      id?: number;
      name: string;
      category: string;
      amount: number;
      frequency: Frequency;
      rule: ScheduleRule;
      enabled: boolean;
    }) {
      const rule_json = JSON.stringify(input.rule);
      const enabled = input.enabled ? 1 : 0;

      if (input.id) {
        await db.runAsync(
          "UPDATE expenses SET name=?, category=?, amount=?, frequency=?, rule_json=?, enabled=? WHERE id=?",
          input.name,
          input.category,
          input.amount,
          input.frequency,
          rule_json,
          enabled,
          input.id
        );
      } else {
        await db.runAsync(
          "INSERT INTO expenses (name, category, amount, frequency, rule_json, enabled) VALUES (?, ?, ?, ?, ?, ?)",
          input.name,
          input.category,
          input.amount,
          input.frequency,
          rule_json,
          enabled
        );
      }
    },

    async deleteExpense(id: number) {
      await db.runAsync("DELETE FROM expenses WHERE id = ?", id);
    },

    // FLOWS
    async listFlows(): Promise<FlowRow[]> {
      return await db.getAllAsync<FlowRow>("SELECT * FROM flows ORDER BY id DESC");
    },

    async upsertFlow(input: {
      id?: number;
      flow_type: string;
      name: string;
      amount: number;
      frequency: Frequency;
      rule: ScheduleRule;
      enabled: boolean;
      goal_target?: number | null;
    }) {
      const rule_json = JSON.stringify(input.rule);
      const enabled = input.enabled ? 1 : 0;

      if (input.id) {
        await db.runAsync(
          "UPDATE flows SET flow_type=?, name=?, amount=?, frequency=?, rule_json=?, goal_target=?, enabled=? WHERE id=?",
          input.flow_type,
          input.name,
          input.amount,
          input.frequency,
          rule_json,
          input.goal_target ?? null,
          enabled,
          input.id
        );
      } else {
        await db.runAsync(
          "INSERT INTO flows (flow_type, name, amount, frequency, rule_json, goal_target, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)",
          input.flow_type,
          input.name,
          input.amount,
          input.frequency,
          rule_json,
          input.goal_target ?? null,
          enabled
        );
      }
    },

    async deleteFlow(id: number) {
      await db.runAsync("DELETE FROM flows WHERE id = ?", id);
    },
  };
}
