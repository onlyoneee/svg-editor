export interface EditCommand {
  execute(): void;
  undo(): void;
}
