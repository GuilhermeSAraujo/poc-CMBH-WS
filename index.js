import { chromium } from "@playwright/test";

const url = "https://www.cmbh.mg.gov.br/atividade-legislativa/pesquisar-proposicoes";

(async () => {
  // Iniciar o navegador
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navegar até a URL
  await page.goto(url, { waitUntil: "networkidle" });

  // Selecionar a lista de proposições
  const items = page.locator("ul.lista-pesquisas > li");

  // Obter a quantidade de itens
  const itemCount = await items.count();
  console.log(`Total de proposições encontradas: ${itemCount}`);

  // Iterar sobre cada item para extrair os dados
  const data = [];
  for (let i = 0; i < itemCount; i++) {
    const item = items.nth(i);
    console.log("item", item);
    // const title = await item.locator("h3 > span.left.detalhar").innerText();
    // const downloadLink = await item.locator("a.btn-barra").getAttribute("href");
    const author = await item
      .locator("p:has-text('Autoria:')")
      .innerText()
      .catch(() => "Não informado");
    const summary = await item
      .locator("p:has-text('Ementa:')")
      .innerText()
      .catch(() => "Não informado");
    const subject = await item
      .locator("p:has-text('Assunto:')")
      .innerText()
      .catch(() => "Não informado");
    const status = await item
      .locator("p:has-text('Situação:')")
      .innerText()
      .catch(() => "Não informado");
    const currentPhase = await item
      .locator("p:has-text('Fase Atual:')")
      .innerText()
      .catch(() => "Não informado");

    // Adicionar os dados ao array
    data.push({
      //   title,
      //   downloadLink: downloadLink ? `https://www.cmbh.mg.gov.br${downloadLink}` : "Não disponível",
      author: author.replace("Autoria: ", ""),
      summary: summary.replace("Ementa: ", ""),
      subject: subject.replace("Assunto: ", ""),
      status: status.replace("Situação: ", ""),
      currentPhase: currentPhase.replace("Fase Atual: ", ""),
    });
  }

  // Exibir os dados extraídos
  console.log(data);

  // Fechar o navegador
  await browser.close();
})();
