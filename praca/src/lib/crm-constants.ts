export const STAGES = ["new", "contacted", "visit", "proposal", "closing"] as const;
export type Stage = (typeof STAGES)[number];
export const CONTACT_KINDS = ["lead", "buyer", "seller", "landlord", "tenant", "investor", "fsbo"] as const;
export const PROSPECT_STATUS = ["new", "contacted", "replied", "meeting", "signed", "discarded"] as const;
export const WEBHOOK_EVENTS = ["contact.created", "deal.created", "deal.stage_changed", "prospect.created"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
