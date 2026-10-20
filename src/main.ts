import { DocumentSession } from "./application/services/DocumentSession.js";
import { ShapeFactory } from "./domain/shapes/ShapeFactory.js";
import { SvgFileStore } from "./infrastructure/filesystem/SvgFileStore.js";
import { CliApplication } from "./presentation/cli/CliApplication.js";
import { CommandRegistry } from "./presentation/cli/CommandRegistry.js";
import { CommandTokenizer } from "./presentation/cli/CommandTokenizer.js";
import { ConsoleOutput } from "./presentation/cli/ConsoleOutput.js";
import { AddToCliCommand } from "./presentation/cli/commands/AddToCliCommand.js";
import { BackCliCommand } from "./presentation/cli/commands/BackCliCommand.js";
import { CanvasCliCommand } from "./presentation/cli/commands/CanvasCliCommand.js";
import { CreateCliCommand } from "./presentation/cli/commands/CreateCliCommand.js";
import { DeleteCliCommand } from "./presentation/cli/commands/DeleteCliCommand.js";
import { FrontCliCommand } from "./presentation/cli/commands/FrontCliCommand.js";
import { GroupCliCommand } from "./presentation/cli/commands/GroupCliCommand.js";
import { HelpCliCommand } from "./presentation/cli/commands/HelpCliCommand.js";
import { InitCliCommand } from "./presentation/cli/commands/InitCliCommand.js";
import { MoveCliCommand } from "./presentation/cli/commands/MoveCliCommand.js";
import { ReadCliCommand } from "./presentation/cli/commands/ReadCliCommand.js";
import { RedoCliCommand } from "./presentation/cli/commands/RedoCliCommand.js";
import { SaveCliCommand } from "./presentation/cli/commands/SaveCliCommand.js";
import { ScaleCliCommand } from "./presentation/cli/commands/ScaleCliCommand.js";
import { SetCliCommand } from "./presentation/cli/commands/SetCliCommand.js";
import { ShowCliCommand } from "./presentation/cli/commands/ShowCliCommand.js";
import { TreeCliCommand } from "./presentation/cli/commands/TreeCliCommand.js";
import { UndoCliCommand } from "./presentation/cli/commands/UndoCliCommand.js";
import { UngroupCliCommand } from "./presentation/cli/commands/UngroupCliCommand.js";
import { ShowFormatter } from "./presentation/formatters/ShowFormatter.js";
import { TreeFormatter } from "./presentation/formatters/TreeFormatter.js";

const output = new ConsoleOutput();
const session = new DocumentSession(new SvgFileStore());
const shapeFactory = new ShapeFactory();
const registry = new CommandRegistry();

registry.register(new InitCliCommand(session, output));
registry.register(new ReadCliCommand(session, output));
registry.register(new SaveCliCommand(session, output));
registry.register(new CanvasCliCommand(session, output));
registry.register(new CreateCliCommand(session, shapeFactory, output));
registry.register(new DeleteCliCommand(session, output));
registry.register(new MoveCliCommand(session, output));
registry.register(new ScaleCliCommand(session, output));
registry.register(new SetCliCommand(session, output));
registry.register(new GroupCliCommand(session, output));
registry.register(new UngroupCliCommand(session, output));
registry.register(new AddToCliCommand(session, output));
registry.register(new FrontCliCommand(session, output));
registry.register(new BackCliCommand(session, output));
registry.register(new TreeCliCommand(session, new TreeFormatter(), output));
registry.register(new ShowCliCommand(session, new ShowFormatter(), output));
registry.register(new UndoCliCommand(session, output));
registry.register(new RedoCliCommand(session, output));
registry.register(new HelpCliCommand(registry, output));

const application = new CliApplication(
  process.stdin,
  process.stdout,
  output,
  new CommandTokenizer(),
  registry,
);

application.run();
