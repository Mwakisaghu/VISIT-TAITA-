"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { CONTACT_LIMITS as L, CONTACT_TOPICS, topicLabel } from "@/lib/contact";
import { parseRecipients, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { readSiteInfo } from "@/lib/site-info";

export type ContactResult = { success?: true; error?: string };

const schema = z.object({
  name: z.string().trim().min(L.nameMin).max(L.nameMax),
  email: z.string().trim().toLowerCase().email().max(254),
  topic: z.enum(CONTACT_TOPICS.map((t) => t.value) as [string, ...string[]]),
  message: z.string().trim().min(L.messageMin).max(L.messageMax),
});

const HOUR_MS = 60 * 60 * 1000;

/**
 * Sends a message from the contact page to the team. The rule that matters: a message must never be silently lost.
 * If email isn't set up, or no team inbox is configured, the visitor is told so (and given the address to write to)
 * instead of seeing a false "sent". If the provider is down the message is queued in the outbox and retried, which
 * counts as sent.
 */
export async function submitContactMessage(formData: FormData): Promise<ContactResult> {
  // Honeypot: a hidden field real people never fill. Bots get the same "success" so they learn nothing.
  if (String(formData.get("website") ?? "").trim() !== "") return { success: true };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "Please check your name, email and message (at least 10 characters)." };
  const { name, email, topic, message } = parsed.data;

  const forwarded = headers().get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || headers().get("x-real-ip") || "";
  if (ip && !rateLimit(`contact:ip:${ip}`, 5, HOUR_MS)) return { error: "Too many messages — please try again a little later." };
  if (!rateLimit(`contact:email:${email}`, 3, HOUR_MS)) return { error: "You've sent several messages already — please wait a little before sending another." };

  const info = readSiteInfo();
  const team = parseRecipients(process.env.NOTIFY_EMAIL);
  const recipients = topic === "PRIVACY" ? [...new Set([...team, ...parseRecipients(info.privacyEmail)])] : team;
  const fallback = info.contactEmail ? ` Please email us at ${info.contactEmail} instead.` : "";

  if (recipients.length === 0) return { error: `The contact form isn't set up yet.${fallback}` };

  const result = await sendEmail({
    to: recipients,
    subject: `[Contact · ${topicLabel(topic)}] ${name}`,
    text: [`Topic: ${topicLabel(topic)}`, `From: ${name} <${email}>`, "", message].join("\n"),
    replyTo: email,
  });

  // Delivered, or recorded in the outbox and certain to be retried: either way the message is safe.
  if (result.ok || result.queued) return { success: true };
  // Not delivered AND not queued (email isn't configured, or the provider and the outbox were both down): it would be
  // lost, so say so and give another way to reach us — never a false "sent".
  return { error: `We couldn't send your message just now.${fallback}` };
}
