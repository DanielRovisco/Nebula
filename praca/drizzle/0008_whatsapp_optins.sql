CREATE TABLE "whatsapp_optins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text,
	"code_expires_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_optins" ADD CONSTRAINT "whatsapp_optins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;