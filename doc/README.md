# SVG 编辑器架构与开发记录

本文档随代码共同演进。当前已完成项目骨架、领域模型、SVG 读写、编辑命令历史及完整 CLI 命令解析。

## 架构方案

### 模块划分

| 模块     | 目录                 | 职责                                     |
| -------- | -------------------- | ---------------------------------------- |
| 领域模型 | `src/domain`         | SVG 文档、图形类层次、容器关系和领域约束 |
| 应用层   | `src/application`    | 编辑命令、Command 历史和应用服务         |
| 基础设施 | `src/infrastructure` | SVG 解析与序列化、文件系统适配           |
| 表现层   | `src/presentation`   | CLI、命令行输出和树形/明细格式化         |
| 组合入口 | `src/main.ts`        | 创建具体实现并启动应用                   |

```plantuml
@startuml
package "Presentation" {
  [CLI]
  [Formatters]
}

package "Application" {
  [Commands]
  [History]
  [Services]
}

package "Domain" {
  [SVG Document]
  [Shapes]
}

package "Infrastructure" {
  [SVG I/O]
  [File System]
}

[CLI] --> [Commands]
[CLI] --> [Services]
[Formatters] --> [SVG Document]
[Commands] --> [SVG Document]
[History] --> [Commands]
[Services] --> [SVG Document]
[SVG I/O] --> [SVG Document]
[File System] --> [Services]
@enduml
```

### 设计模式的选择

- **Command**：每条可撤销编辑命令实现统一的 `execute`/`undo` 协议；`CommandHistory` 管理 undo/redo 栈。一条用户命令对应一个原子撤销单元。
- **Composite**：叶子图形和 `g` 容器通过统一图形抽象参与移动、缩放、删除和属性设置。容器负责把适用操作递归传递给子孙。
- **Factory**：图形类型名到具体类的映射集中在一个工厂。它是需求允许的两处按名称分派之一，后续插件化阶段再替换为注册机制。
- **Memento**：移动和缩放命令在执行前捕获图形几何状态；容器的 Memento 组合其全部子孙状态，避免用逆运算撤销时产生浮点误差。
- **Registry**：CLI 通过命令注册表完成命令名到处理器的分派，新增命令只需实现统一接口并在组合根注册。
- **Visitor**：SVG 序列化和 CLI 图形格式化都通过图形 Visitor 获取具体类型数据，使展示逻辑无需按标签名分派。

上述模式均已在对应模块落地。命令名分派只存在于 `CommandRegistry`，图形类型到具体类的分派只存在于 `ShapeFactory`。

### 依赖方向规则

1. `domain` 不依赖应用层、基础设施层或表现层。
2. `application` 可以依赖 `domain`，不能依赖具体 CLI、XML 库或文件系统实现。
3. `presentation` 可以依赖 `application` 和只读的领域抽象，不能直接调用基础设施实现。
4. `infrastructure` 实现应用层定义的端口，并可依赖 `domain`。
5. `main.ts` 是组合根，可以依赖所有模块，业务逻辑不得放在此处。
6. 命令名分派只出现在 CLI 命令注册处；图形类型名分派只出现在图形工厂。

依赖方向的目标是使图形规则和编辑命令可以脱离终端、文件系统及具体 XML 库进行测试。

### 变化点假设

| 可能变化                         | 当前预留                                     |
| -------------------------------- | -------------------------------------------- |
| 新增图形类型                     | 图形类层次和集中式工厂；插件注册留到后续阶段 |
| 新增 CLI 命令或其他交互通道      | 命令对象与表现层分离；CLI 使用命令注册点     |
| 替换 XML 解析库                  | SVG 读写限制在 `infrastructure/svg`          |
| 替换本地文件系统                 | 文件访问限制在 `infrastructure/filesystem`   |
| 输出到终端、测试缓冲区或其他界面 | 表现层通过 `Output` 接口输出                 |
| 撤销策略变化                     | 历史职责集中在 `application/history`         |
| XML 库或文件存储方式变化         | `DocumentStore` 端口隔离应用层与具体实现     |

当前不为网络协作、GUI 和插件动态加载实现扩展框架，因为这些内容不属于 Phase 1 的交付范围。

## 过程记录

### 阶段 1：项目骨架

- 仓库开始时为空，只有 Git 元数据和远程地址。
- 选择 TypeScript 严格模式，尽早发现未处理的空值、错误类型和大小写问题。
- 测试使用 Node 内置测试运行器，避免为当前规模引入额外测试框架。
- 输出经由 `Output` 接口，`ConsoleOutput` 统一添加 `warning:` 和 `error:` 前缀；成功反馈和显示内容不添加前缀。
- CLI 当前只实现启动、注释/空行忽略和安全退出。业务命令将在后续阶段实现。

### 阶段 2：领域模型

- 以 `Shape` 抽象类集中实现移动、缩放及公共样式属性的入口校验，六种图形类分别封装自身几何字段和属性白名单。
- `Group` 与叶子图形共享同一抽象，并递归移动、缩放子孙，形成 Composite。
- `SvgDocument` 作为聚合根维护画布、根节点顺序和全局 ID 索引；所有新增子树均先完整检查重复 ID，再修改结构。
- 初版设计允许直接修改已挂载的 `Group`，但这会让文档索引失步。复核后增加 `ShapeOwner` 协议，让容器增删子树时同步注册或注销索引，并用测试固定该约束。
- 父子移动先检查目标是否位于待移动容器的子树中，再摘除原节点，保证循环关系错误不会造成部分修改。
- 删除子树会保留其内部父子结构，并返回原父容器和位置，供后续 Command 撤销恢复使用。

### 阶段 3：SVG 读写

- `SvgSerializer` 使用 Visitor 对六种图形进行多态序列化，没有新增按标签名判断的分派点；输出包含 XML 声明、SVG 命名空间、画布和 `viewBox`。
- `SvgParser` 使用保序 XML 解析结果重建图形树。所有显式 ID 会先被收集，缺失 ID 再按标签编号，因此自动生成的 ID 不会与文件后部的显式 ID 冲突。
- 属性值和 text 内容分别使用对应的 XML 转义规则；读取时由 XML 解析器还原实体。
- `DocumentSession` 先让 `DocumentStore` 完整读取候选文档，成功后才替换当前文档和路径。文件不存在、XML 非法或模型校验失败时，旧状态保持不变。
- 当前领域模型无法无损表达 `path`、任意 SVG 属性、复杂 `viewBox` 和 `transform`。解析器对此明确报错，避免保存时静默丢失内容或改变视觉结果。该范围与 Phase 1 的六种内置图形一致。
- 拒绝 `DOCTYPE` 和自定义实体，只接受标准 XML 实体，避免把 SVG 读取变成外部实体或文档类型处理入口。

### 阶段 4：Command 和历史

- 每个编辑操作均为独立 Command 类，实现 `execute` 和 `undo`。`create`、`delete`、`move`、`scale`、`set`、`front`、`back`、`addto`、`group`、`ungroup` 已全部覆盖。
- `CommandHistory` 在命令成功后才写入 undo 栈。失败命令不进入历史，也不会清空已有 redo 栈；undo 后的新编辑成功时才清空 redo。
- `SvgDocument` 提供位置快照和按父容器、索引精确复原的能力。删除、层级移动和 z-order 撤销均恢复原父容器与原顺序。
- `group` 在修改前验证全部 ID、重复选择和祖先/子孙冲突，整组操作只占一个历史单元；子图形按照原树顺序进入新组。`ungroup` 同样一次提升或恢复全部直接子节点。
- move/scale 使用几何 Memento 撤销。对 `g` 创建 Memento 时递归捕获子孙，因此小数几何值也能精确恢复。
- `DocumentSession` 在成功的 init/read/save/canvas 修改后清空旧历史并建立屏障。下一条成功编辑解除屏障并开始新的历史段；失败的 I/O 或画布修改不影响现有历史。

### 阶段 5：命令解析和 CLI

- `CommandTokenizer` 逐字符识别双引号参数，支持引号内的转义引号、反斜杠和空字符串；`#` 只在整行开头表示注释，因此 SVG 颜色值不会被误删。
- `CommandRegistry` 是唯一的命令名分派点。19 条文档、编辑、显示和历史命令均实现同一 `CliCommand` 接口，由 `main.ts` 统一装配。
- `CliArguments` 统一检查参数数量和有限数值；`create` 仅在参数尾部识别 `in <containerId>`，六种图形的参数到具体类型转换继续集中在 `ShapeFactory`。
- `tree` 和 `show` 共享基于 Visitor 的图形格式化器，支持嵌套树、父容器、几何属性、文本和公共样式显示。
- CLI 在单条命令边界捕获错误并经 `Output` 输出，失败后继续处理下一行。读入 SVG 的自动 ID 信息沿同一接口输出为 `warning:`。
- 端到端测试用真实 Node 子进程回放典型会话，覆盖注释、引号、颜色、全部命令类型、历史屏障、读写文件和失败后继续执行。

### 阶段 6：集成测试

- 集成测试直接启动编译后的 CLI 子进程，输入与真实用户相同的逐行命令，并检查 stdout、stderr、`tree` 快照和保存文件，避免只验证内部方法调用。
- 对十种编辑命令分别记录执行前、执行后、undo 后和 redo 后的 `tree`。测试要求 undo 后与原快照完全相等、redo 后与执行结果完全相等，同时检查关键几何值和兄弟顺序。
- 六种图形在同一会话中完成创建、`tree`/`show` 显示和保存；text 覆盖空格、中文、引号及 XML 特殊字符，保存结果再经 XML 校验器验证。
- 多层 `create ... in`、容器递归移动/缩放、删除整棵子树、`group`/`ungroup`/`addto` 的顺序恢复，以及 `front`/`back` 只影响同级节点均有 CLI 快照断言。
- 对重复 ID、缺失对象、非法数值、非正缩放和失败文件操作，在错误前后比较完整 `tree` 文本，确认失败没有造成部分修改。
- 文件场景覆盖缺失 ID 自动编号与警告、不存在的输入文件、不可写的输出目标，以及失败 I/O 后当前文档和可撤销历史仍可继续使用。

| 用户可见行为                | 集成验证方式                                    |
| --------------------------- | ----------------------------------------------- |
| 六种图形、Unicode、XML 转义 | CLI 创建并保存，检查显示、SVG 元素和 XML 合法性 |
| 每种编辑命令的 undo/redo    | 四次 `tree` 快照做执行、撤销、重做对称比较      |
| 容器和顺序操作              | 比较嵌套树、几何值和兄弟节点出现顺序            |
| 错误原子性                  | 每条错误命令后重新执行 `tree` 并与基准严格相等  |
| I/O 和历史屏障              | 检查错误输出、自动 ID 警告和屏障后的 undo 行为  |
| 完整 transcript             | 真实子进程逐行回放需求文档会话                  |

## 一致性自查

### 模块划分

实际目录与架构方案一致。`domain`、`application/commands`、`application/history`、`application/services`、`infrastructure/svg`、`infrastructure/filesystem`、`presentation/cli` 和 `presentation/formatters` 均已由具体实现填充。

### 依赖方向

领域层只引用领域内部类型，不依赖应用层、基础设施层或表现层。应用层命令依赖领域模型，历史模块只依赖命令接口；`DocumentSession` 依赖领域模型、历史和 `DocumentStore` 抽象。基础设施层实现该端口并依赖 SVG XML 库。表现层依赖应用服务、命令和只读领域对象，不引用基础设施；具体文件存储只在组合根注入。未发现违反依赖规则的引用。

后续每个阶段完成后继续抽样检查 import 方向，并在出现偏差时更新本节和修订记录。

## 质量保证手段

当前质量门禁为：

1. `npm run build`：使用 TypeScript 严格模式编译生产代码。
2. `npm test`：编译并运行 57 项 Node 测试，其中集成层通过真实 CLI 子进程覆盖六种图形、显示与保存、多层组合、全部编辑命令的 undo/redo、顺序恢复、redo 清空、历史屏障、错误原子性、文件异常、Unicode、XML 特殊字符和完整 transcript；单元层继续覆盖领域不变量和读写细节。
3. `npm run format:check`：验证源码、配置和文档格式。
4. `npm run check`：顺序执行以上全部检查。
5. CLI 端到端检查：以子进程启动程序，逐行回放需求中的典型操作，验证横幅、`svg>` 提示符、输出、错误恢复和 `exit`/`quit` 退出。
