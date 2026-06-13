export function getAirNowApiKey(): string {
  return (
    process.env.AIRNOW_API_KEY?.trim() ||
    process.env.AIR_NOW_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_AIRNOW_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_AIR_NOW_API_KEY?.trim() ||
    ""
  );
}
