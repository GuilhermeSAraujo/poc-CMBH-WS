import { chromium } from "@playwright/test";

const url = "https://www.cmbh.mg.gov.br/atividade-legislativa/pesquisar-proposicoes";

async function extractDataFromPage(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll("ul.lista-pesquisas > li")).map((li) => {
      const title = li.querySelector("h3 span").textContent.trim();
      const textoInicial = li.querySelector('a[title="Baixar texto inicial"]')?.href || "";
      const tramitacaoUrl =
        li.querySelector("span[data-caminho]")?.getAttribute("data-caminho") || "";

      // Função auxiliar para extrair texto dos parágrafos
      const getInfo = (label) => {
        const paragraphs = li.querySelectorAll("p");
        for (const p of paragraphs) {
          if (p.querySelector("strong")?.textContent.includes(label)) {
            return p.textContent.replace(label, "").trim();
          }
        }
        return "Não informado";
      };

      // Função auxiliar para extrair votos
      const getVotes = () => {
        const favor = li.querySelector(".favor")?.textContent || "0 foram a favor";
        const contra = li.querySelector(".contra")?.textContent || "0 foram contra";
        return { favor, contra };
      };

      return {
        title,
        textoInicial,
        tramitacaoUrl,
        author: getInfo("Autoria:"),
        summary: getInfo("Ementa:"),
        subject: getInfo("Assunto:"),
        status: getInfo("Situação:"),
        votes: getVotes(),
      };
    });
  });
}

async function getAllProposicoes(page) {
  const allData = [];

  await page.waitForSelector(".resumoResultados");

  const totalItems = await page.evaluate(() => {
    const resumo = document.querySelector(".resumoResultados").textContent;
    const quantidadeTotal = resumo.split(" ")[13];
    return quantidadeTotal ? parseInt(quantidadeTotal) : 0;
  });
  const itemsPerPage = 7;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  console.log(`Total de itens: ${totalItems}`);
  console.log(`Total de páginas: ${totalPages}`);

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    try {
      console.log(`Processando página ${currentPage} de ${totalPages}`);

      // Extrai dados da página atual
      const pageData = await extractDataFromPage(page);
      console.log("pegou os dados da página atual", pageData.length);
      allData.push(...pageData);

      // Se não for a última página, vai para a próxima
      if (currentPage < totalPages) {
        // Clica no botão da próxima página
        // await page.click(`a.mudarPagina[href="#inicioResultados"]:text("${currentPage + 1}")`);
        getByRole("link", { name: ">" }).first();

        // Espera adicional para garantir que o conteúdo carregou
        await page.waitForTimeout(3000);

        // Verifica se a página mudou corretamente
        const currentPageNumber = await page.evaluate(() => {
          return document.querySelector(".pagination li.active a")?.textContent || "1";
        });
        console.log("currentPageNumber", currentPage, currentPageNumber);
        if (parseInt(currentPageNumber) !== currentPage + 1) {
          throw new Error(`Falha ao mudar para página ${currentPage + 1}`);
        }
      }
    } catch (error) {
      console.error(`Erro na página ${currentPage}:`, error);

      // Tenta recuperar de erros
      await page.reload();
      await page.waitForTimeout(5000);
      currentPage--; // Tenta a mesma página novamente
      continue;
    }
  }

  return allData;
}

// Modificação do código principal
(async () => {
  const browser = await chromium.launch({
    headless: false,
    timeout: 60000, // aumenta timeout global
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    const tipoProposicaoElement = page.getByLabel("Tipo de proposição:");
    await tipoProposicaoElement.click();
    await tipoProposicaoElement.selectOption({ label: "Projeto de Lei" });

    await page.getByLabel("Ano").fill("2020");
    await page.getByText("Pesquisar", { exact: true }).click();
    await page.waitForTimeout(5000);
    // Coleta dados de todas as páginas
    const allData = await getAllProposicoes(page);

    // Salva os dados em um arquivo
    const fs = require("fs");
    fs.writeFileSync("proposicoes.json", JSON.stringify(allData, null, 2));

    console.log(`Total de proposições coletadas: ${allData.length}`);
  } catch (error) {
    console.error("Erro durante a execução:", error);
  } finally {
    await browser.close();
  }
})();
