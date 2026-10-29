import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots_f3"
SHOTS.mkdir(exist_ok=True)
BASE = "http://localhost:8080"
errors = []

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))

        # 1. Modo guiado é o default; pré-requisitos com nome e retomada
        await page.goto(BASE + "/concepts/13", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(SHOTS / "01_guided.png"))
        body = await page.inner_text("body")
        lower = body.lower()
        # Rótulos com CSS uppercase chegam transformados no innerText:
        # comparação case-insensitive por rótulo (nunca body.upper()).
        for label in ["guiada", "consulta", "prática", "síntese",
                      "princípio", "condições de uso", "erro mais provável",
                      "próxima aplicação"]:
            assert label in lower, f"ausente no modo guiado: {label}"
        assert "Timeouts" in body, "nome do pre-requisito 11 ausente"
        assert "Retries" in body, "nome do pre-requisito 12 ausente"
        assert "Retomada curta" in body, "retomada curta ausente"
        assert "mode=" not in page.url, "modo default nao deveria aparecer na URL"
        print("1. guiado default com pre-reqs nomeados ok; url:", page.url)

        # 2. Previsão antes do modelo; timeline dedicada aparece depois
        assert "Mental model" not in body, "modelo visivel antes da previsao"
        await page.fill("textarea[aria-label='Sua previsão']", "espera cresce sem controle")
        await page.get_by_role("button", name="Revelar o modelo").click()
        await page.wait_for_timeout(400)
        body = await page.inner_text("body")
        assert "Mental model" in body, "modelo nao revelado apos previsao"
        assert "Timeline —" in body, "timeline dedicada ausente"
        assert "Retry 1 wait" in body, "evento da timeline ausente"
        assert "ceiling 100" in body, "valores da timeline ausentes"
        await page.screenshot(path=str(SHOTS / "02_revelado.png"))
        print("2. previsao -> modelo -> timeline ok")

        # 3. Pré-requisito leva ao conceito e o chip devolve ao mesmo ponto
        await page.get_by_role("link", name="Retries", exact=False).first.click()
        await page.wait_for_timeout(900)
        assert "/concepts/12" in page.url, "navegou para o pre-requisito errado: " + page.url
        assert "from=13" in page.url, "parametro from ausente: " + page.url
        await page.screenshot(path=str(SHOTS / "03_prereq.png"))
        body = await page.inner_text("body")
        assert "Retomar aula" in body, "chip de retorno ausente"
        await page.get_by_role("link", name="Retomar aula", exact=False).first.click()
        await page.wait_for_timeout(900)
        assert "/concepts/13" in page.url, "nao retornou a aula: " + page.url
        body = await page.inner_text("body")
        assert "Retries" in body, "pre-requisitos nao visiveis ao voltar"
        print("3. retorno ao mesmo ponto ok; url:", page.url)

        # 4. Modo consulta: definição/limites sem a prática, com link ao guiado
        await page.goto(BASE + "/concepts/13?mode=reference", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        body = await page.inner_text("body")
        assert "Definição" in body, "definicao ausente na consulta"
        assert "Contraexemplos" in body, "contraexemplos ausentes"
        assert "Abrir o modo guiado" in body, "link para o modo guiado ausente"
        assert "Submit decision" not in body, "pratica vazou no modo consulta"
        assert "Síntese" in body, "sintese ausente no modo consulta"
        await page.screenshot(path=str(SHOTS / "04_reference.png"))
        print("4. modo consulta ok; url:", page.url)

        # 5. Modo prática: motor + variante + critérios, síntese presente
        await page.goto(BASE + "/concepts/13?mode=practice", wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        body = await page.inner_text("body")
        assert "Submit decision" in body, "tarefa de pratica ausente"
        assert "Variante de transferência" in body, "variante ausente"
        assert "Síntese" in body, "sintese ausente no modo pratica"
        await page.screenshot(path=str(SHOTS / "05_practice.png"))
        print("5. modo pratica ok; url:", page.url)

        await browser.close()

    print("PAGEERRORS:", json.dumps(errors))
    assert not errors, f"pageerrors: {errors}"
    print("E2E F3 OK")

asyncio.run(main())
