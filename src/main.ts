import { CliApplication } from "./presentation/cli/CliApplication.js";
import { ConsoleOutput } from "./presentation/cli/ConsoleOutput.js";

const output = new ConsoleOutput();
const application = new CliApplication(process.stdin, process.stdout, output);

application.run();
