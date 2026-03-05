import { redirect } from "next/navigation"

/**
 * voice-duplex (January 2026) has been superseded by test-voice v8.0+
 * which includes full MYCA consciousness integration.
 */
export default function VoiceDuplexPage() {
  redirect("/test-voice")
}
