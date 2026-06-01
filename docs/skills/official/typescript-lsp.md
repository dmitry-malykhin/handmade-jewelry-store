# typescript-lsp

**Priority:** P0 — установить первым.

## Что делает

Подключает TypeScript Language Server к Claude. Дальше Claude видит:
- Type errors в реальном времени
- "Go to definition" / "Find references"
- Symbol-aware рефакторинг (rename across files)
- Diagnostics из `tsc` + ESLint

Без этого плагина Claude читает .ts/.tsx как plain text — пропускает type errors, не находит referrers через grep, ошибается с импортами.

## Установка

```bash
/plugin install typescript-lsp@claude-plugins-official --scope user
```

Никаких env vars. Никаких credentials. Чистый wrapper над `typescript-language-server`, который должен быть в `$PATH`:

```bash
which typescript-language-server || npm install -g typescript-language-server typescript
```

В нашем монорепо `typescript` уже dev-dependency, так что глобальная установка опциональна — LSP подцепится из локального `node_modules`.

## Использование

После установки **никаких команд не нужно** — плагин работает passively. Claude автоматически:

- При чтении `.ts/.tsx` файла видит type errors в самом ответе LSP
- При редактировании сразу видит сломанные импорты
- При rename — может корректно обновить все usages в монорепо

## Когда особенно полезен

- **Рефакторинги**: переименование `getCwd → getCurrentWorkingDirectory` через монорепо
- **Поиск usages**: где используется `OrderStatus.PROCESSING` через apps/web + apps/api + packages/shared
- **Type errors во время Edit**: ловит сразу, без ожидания `pnpm tsc` в hook

## Пересечения с другими инструментами

- **`code-review` skill** использует диагностику LSP — без LSP даёт менее точные findings
- **`tsc --noEmit` Stop hook** — дополняет: LSP ловит during-turn, hook — финальный gate

## Trade-offs

- Прибавляет ~200 МБ RAM на каждую запущенную сессию Claude (типичный TS LSP)
- В очень больших монорепо (>5000 файлов) может первоначально лагать пока индексирует — у нас не критично

## Источник

- https://code.claude.com/docs/en/discover-plugins — список LSP плагинов
