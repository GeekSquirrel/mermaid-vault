# Anytype MCP 使用经验

> `mermaid-vault` 空间是项目文档唯一 SoT（Wiki = 开发文档、Tasks 集合 = RoadMap、General 频道 = 想法讨论，分工见根 `AGENTS.md`）。本文件沉淀 Anytype MCP 工具的使用要点：保持简洁，找到更好的方法就删除或重构旧条目。

## 定位

- 先 `API-list-spaces` 按 `name` 找到 `mermaid-vault` 空间拿 `space_id`。
- 所有对象/类型/属性/标签的 id 都是 `bafyrei…` 长字符串，一律从 `API-list-*` / `API-get-*` 响应中实时读取后透传，不要凭记忆拼写或硬编码。

## 读写要点

- 聊天：`API-get-chat-messages` 读，`API-add-chat-message` 发（支持 Markdown 文本）。
- 创建对象 `API-create-object` 必须给 `type_key`（先 `API-list-types`）；select 属性传**标签 id** 而非标签名（先对属性 `API-list-tags`）。
- 集合加内容用 `API-add-list-objects`（`list_id` 就是 collection 对象的 id）。
- **collection 布局的对象创建时不能带 `body`**，否则报 500 `failed to create block`；先建空集合，需要说明文字再用 `API-update-object` 补。
- Task 完成时同时设置 `status=Done` 标签与 `done=true` checkbox，保持看板与勾选一致。

## 约定

- 新开发文档用 `wiki` 类型创建，并在「Wiki」根对象中登记一行，保持索引完整。
