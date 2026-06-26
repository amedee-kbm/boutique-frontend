CREATE TABLE "category_filter_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filter_id" uuid NOT NULL,
	"value" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"product_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"name_snapshot" text NOT NULL,
	"color_value" text,
	"size_value" text,
	"price_snapshot" numeric(10, 2) NOT NULL,
	"image_url_snapshot" text
);
--> statement-breakpoint
CREATE TABLE "product_filter_values" (
	"product_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "product_filter_values_product_id_option_id_pk" PRIMARY KEY("product_id","option_id")
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "option_id" uuid;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD COLUMN "hex" text;--> statement-breakpoint
ALTER TABLE "category_filter_options" ADD CONSTRAINT "category_filter_options_filter_id_category_filters_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."category_filters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_filters" ADD CONSTRAINT "category_filters_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_items" ADD CONSTRAINT "chat_message_items_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_items" ADD CONSTRAINT "chat_message_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filter_values" ADD CONSTRAINT "product_filter_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filter_values" ADD CONSTRAINT "product_filter_values_option_id_category_filter_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."category_filter_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_option_id_product_variant_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_variant_options"("id") ON DELETE set null ON UPDATE no action;