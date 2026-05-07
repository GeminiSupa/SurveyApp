export type StudyBlockType = "consent" | "survey" | "multiple_choice" | "ux_task" | "iat" | "reaction_time" | "brs" | "thank_you" | "attention_check";

export type StudyBlock = {
  id: string;
  block_type: StudyBlockType;
  label: string;
  sort_order: number;
  config: Record<string, unknown>;
};

export type Study = {
  id: string;
  public_id: string;
  title: string;
  status: "draft" | "published" | "archived";
};
