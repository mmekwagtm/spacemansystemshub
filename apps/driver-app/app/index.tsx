import { ASSIGNMENT_STATUSES } from "@spaceman/app-core";
import { spacemanTokens } from "@spaceman/app-ui";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function DriverHomeScreen() {
  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>SPACEMAN / DRIVER APP</Text>
      <Text style={styles.title}>Delivery operations foundation</Text>
      <Text style={styles.body}>
        Location publishing is limited to a foreground active delivery and stops when the delivery is
        no longer active. No V1 media proof is collected.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assignment state remains independent of fulfillment.</Text>
        <Text style={styles.cardBody}>{ASSIGNMENT_STATUSES.join(" · ")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#F5F7F8", flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  eyebrow: { color: spacemanTokens.color.brand, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: spacemanTokens.color.ink, fontSize: 36, fontWeight: "700", lineHeight: 42 },
  body: { color: "#46545C", fontSize: 17, lineHeight: 25 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#D8E1E5", borderRadius: 12, borderWidth: 1, gap: 8, padding: 18 },
  cardTitle: { color: spacemanTokens.color.ink, fontSize: 16, fontWeight: "700" },
  cardBody: { color: "#46545C", fontSize: 14, lineHeight: 21 }
});
