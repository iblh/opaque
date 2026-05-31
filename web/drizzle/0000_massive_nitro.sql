CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "authenticators" (
	"credential_id" text NOT NULL,
	"user_id" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"credential_public_key" text NOT NULL,
	"counter" integer NOT NULL,
	"credential_device_type" text NOT NULL,
	"credential_backed_up" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticators_user_id_credential_id_pk" PRIMARY KEY("user_id","credential_id"),
	CONSTRAINT "authenticators_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"forest" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_agent_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"token_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "server_metric_latest" (
	"server_id" text PRIMARY KEY NOT NULL,
	"stats" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_metric_samples" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"uptime" text DEFAULT '' NOT NULL,
	"cores" integer,
	"load" jsonb,
	"cpu" double precision DEFAULT 0 NOT NULL,
	"memory_used" bigint DEFAULT 0 NOT NULL,
	"memory_total" bigint DEFAULT 0 NOT NULL,
	"disk_used" bigint DEFAULT 0 NOT NULL,
	"disk_total" bigint DEFAULT 0 NOT NULL,
	"network_in" bigint DEFAULT 0 NOT NULL,
	"network_out" bigint DEFAULT 0 NOT NULL,
	"temperature" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" text PRIMARY KEY NOT NULL,
	"dashboard_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"username" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_agent_tokens" ADD CONSTRAINT "server_agent_tokens_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_metric_latest" ADD CONSTRAINT "server_metric_latest_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_metric_samples" ADD CONSTRAINT "server_metric_samples_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboards_user_id_unique" ON "dashboards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "server_agent_tokens_token_id_unique" ON "server_agent_tokens" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "server_agent_tokens_server_id_idx" ON "server_agent_tokens" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "server_metric_samples_server_recorded_at_idx" ON "server_metric_samples" USING btree ("server_id","recorded_at");--> statement-breakpoint
CREATE INDEX "server_metric_samples_recorded_at_idx" ON "server_metric_samples" USING btree ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "servers_dashboard_branch_unique" ON "servers" USING btree ("dashboard_id","branch_id");--> statement-breakpoint
CREATE INDEX "servers_dashboard_id_idx" ON "servers" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "servers_branch_id_idx" ON "servers" USING btree ("branch_id");