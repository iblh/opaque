ALTER TABLE "dashboards" ADD COLUMN "schema_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboards" ALTER COLUMN "schema_version" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "dashboards" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;
