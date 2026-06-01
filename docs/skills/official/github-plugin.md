# github (plugin)

**Priority:** P0.

## Что делает

Wrapper над MCP-сервером GitHub. Даёт Claude:
- Чтение/создание/обновление issues, PRs
- Поиск по коду в репозитории
- Чтение PR comments, reviews, check runs
- Workflow dispatch (запуск GitHub Actions)
- Releases / tags

Альтернатива `gh` CLI, но в формате MCP — Claude получает structured data, а не парсит JSON output.

## Установка

```bash
/plugin install github@claude-plugins-official --scope project
```

При первой попытке использовать — спросит auth. Создать Personal Access Token:

1. https://github.com/settings/tokens → Fine-grained tokens
2. Repository access: `handmade-jewelry-store`
3. Permissions:
   - Contents: Read
   - Issues: Read + Write
   - Pull requests: Read + Write
   - Workflows: Read + Write (если планируете dispatch)
   - Metadata: Read
4. Сохранить в keychain:
   ```bash
   security add-generic-password -a github-mcp -s claude-mcp -w <YOUR_TOKEN>
   ```

## Использование

Все 46 issues #62-#129 уже в репо. Примеры:

```
Проверь, какие issues помечены тегом "in-progress" в этом репо
```

```
Создай draft PR с titles "feat: products API #64", body — описание из issue, base — main
```

```
Покажи последние комментарии к PR #275
```

```
Запусти workflow deploy-aws-ecs.yml на main
```

## Когда применять

- Onboarding нового скилла/фичи → загрузить issue body как контекст
- Babysit-PR loop: `/loop 60s` + "проверь CI на текущей PR"
- Cross-reference нескольких issues: "Что осталось из W4?"
- Подготовка release notes

## Пересечения с другими инструментами

- **`gh` CLI** — для destructive операций (create PR, push). Memory правило: Claude не коммитит/не пушит. Это значит — `gh pr create` и `git push` пользователь делает сам, github MCP только для чтения/правки existing PR.
- **`schedule` skill** — github plugin позволяет создавать issues от scheduled агентов (daily SEO audits → авто-создание issue если что-то сломалось).

## Trade-offs

- Не заменяет `gh` для destructive команд (по дизайну skipped pre-commit checks etc.)
- PAT с broad scopes — security risk. Использовать fine-grained tokens с минимальным набором permissions
- Repository-scoped tokens лучше user-scoped (proportionate trust)

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://github.com/modelcontextprotocol/servers/tree/main/src/github
