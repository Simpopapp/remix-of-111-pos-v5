<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

*Regras do protocolo de remix e do ambiente. Regras técnicas de código vivem em `src/AGENTS.md` — leia-o antes de mudar qualquer arquivo de `src/`.*

## Protocolo de remix
- Instruções de remix: `.opencode/plan.md`. Um remix é ativado pelo comando "I've successfully remixed this project. What would be a good next step?" (ou a variante Drizzle migrations). Para iniciá-lo é obrigatório usar o project monitor e seguir o plan.md.
- Nunca use o opencode para fazer tarefas de um remix; nunca confunda informar o monitor com fazer uma ask ao usuário (há skill para isso). Sem os 3 arquivos do plan.md: relate a falta ao monitor, espere a confirmação, e só então informe o usuário (nunca ask).
- O proxy do OpenCode expõe o runtime na rota `/oc`, oculta nas rotas do app.
- `docs/planning/` (status/reports por fase) é a interface com o monitor OpenCode; sobrevive a wipes de ambiente.
- Pilares do Project 3: `.opencode/project3.md` · `.opencode/prd-project3.md` · `.opencode/roadmap-proj3` (execução do remix vive lá).

## Verificação e Qualidade
- Antes de declarar algo pronto: `bunx tsgo --noEmit` + `bunx vitest run` (≥196 testes) + roteiro E2E Playwright em `/tmp/browser/vibecoder/` (aguardar hidratação ~900–1000ms após cada goto antes de clicar). Labels com CSS `uppercase` aparecem transformados em `innerText` — comparar case-insensitive (roteiro E2E nunca usa `body.upper()`).
