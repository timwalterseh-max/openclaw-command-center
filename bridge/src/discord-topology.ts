export type DiscordAgentConfig = {
  agentId: string;
  channels: string[];
};

export const DISCORD_AGENT_TOPOLOGY: DiscordAgentConfig[] = [
  { agentId: "dispatcher", channels: ["ops-war-room", "ops-alerts"] },
  { agentId: "triage", channels: ["ops-alerts", "incident-intake"] },
  { agentId: "qa", channels: ["release-qa"] },
  { agentId: "release", channels: ["release-control"] },
  { agentId: "infra", channels: ["infra-alerts", "infra-rollouts"] },
  { agentId: "security", channels: ["security-alerts"] },
  { agentId: "support", channels: ["support-escalations"] },
  { agentId: "analytics", channels: ["metrics-watch"] },
  { agentId: "notifier", channels: ["ops-digest"] }
];

export function configuredChannelCount(): number {
  const allChannels = new Set<string>();
  for (const agent of DISCORD_AGENT_TOPOLOGY) {
    for (const channel of agent.channels) {
      allChannels.add(channel);
    }
  }
  return allChannels.size;
}
