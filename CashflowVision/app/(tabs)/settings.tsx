import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Screen, Card, Title, Label, Input, PrimaryButton, Sub } from "../../src/ui/components";
import { useRepo } from "../../src/db/repo";
import type { Frequency } from "../../src/domain/money";

export default function SettingsScreen() {
  const repo = useRepo();
  const [currency, setCurrency] = useState("EUR");
  const [baseFrequency, setBaseFrequency] = useState<Frequency>("monthly");
  const [startingBalance, setStartingBalance] = useState("0");

  useEffect(() => {
    (async () => {
      const s = await repo.getSettings();
      setCurrency(s.currency);
      setBaseFrequency(s.base_frequency);
      setStartingBalance(String(s.starting_balance));
    })();
  }, []);

  async function save() {
    const bal = Number(startingBalance);
    if (!Number.isFinite(bal)) return Alert.alert("Invalid balance", "Enter a valid number.");

    await repo.updateSettings({
      currency: currency.trim() || "EUR",
      base_frequency: baseFrequency,
      starting_balance: bal,
    });
    Alert.alert("Saved");
  }

  return (
    <Screen>
      <Title>Settings</Title>

      <Card>
        <Label>Currency</Label>
        <Input value={currency} onChangeText={setCurrency} autoCapitalize="characters" />
        <Sub>Example: EUR, USD, GBP</Sub>
      </Card>

      <Card>
        <Label>Base frequency</Label>
        <Input value={baseFrequency} onChangeText={(t) => setBaseFrequency(t as Frequency)} />
        <Sub>Use: weekly / fortnightly / monthly</Sub>
      </Card>

      <Card>
        <Label>Starting balance</Label>
        <Input value={startingBalance} onChangeText={setStartingBalance} keyboardType="decimal-pad" />
      </Card>

      <PrimaryButton title="Save" onPress={save} />
    </Screen>
  );
}
