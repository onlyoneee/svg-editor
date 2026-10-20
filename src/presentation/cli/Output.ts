export interface Output {
  display(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}
