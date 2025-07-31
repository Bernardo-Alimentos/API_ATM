/*
================================================================================
ARQUIVO: manualTestAverbacao.js
INSTRUÇÕES: Script autônomo para testar a averbação de uma nota específica
            do banco de dados usando um XML hardcoded.
            Execute via: node manualTestAverbacao.js <ID_DA_NOTA_NO_DB>
================================================================================
*/
require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const averbacaoLogModel = require('./models/averbacaoLogModel');
const atmService = require('./services/atmService');

// ATENÇÃO: ESTE É O XML COMPLETO E PROTOCOLADO PELA SEFAZ, FORNECIDO PELO USUÁRIO.
// O número da nota (<nNF>) dentro deste XML DEVE CORRESPONDER ao numero_nota da nota
// que você vai cadastrar no seu banco de dados para este teste.
//
// OBSERVAÇÃO: A TAG <tpAmb> NESTE XML É 1 (PRODUÇÃO). SE VOCÊ ESTÁ TESTANDO EM UM
// AMBIENTE DE HOMOLOGAÇÃO DA AT&M QUE ESPERA <tpAmb>2</tpAmb>, VOCÊ PRECISARÁ
// ALTERAR MANUALMENTE O VALOR DE <tpAmb> DE 1 PARA 2 DENTRO DESTE XML.
// Se a AT&M aceitou com 1 no Postman em homologação, mantenha como 1.
const SAMPLE_NFE_XML = `
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe versao="4.00" Id="NFe11250705194398000168550010003852501369118583">
<ide>
<cUF>11</cUF>
<cNF>36911858</cNF>
<natOp>VENDA DE PRODUCAO DO ESTABELECIMENTO</natOp>
<mod>55</mod>
<serie>1</serie>
<nNF>385250</nNF>
<dhEmi>2025-07-30T11:53:56-03:00</dhEmi>
<dhSaiEnt>2025-07-30T11:53:56-03:00</dhSaiEnt>
<tpNF>1</tpNF>
<idDest>1</idDest>
<cMunFG>1100122</cMunFG>
<tpImp>1</tpImp>
<tpEmis>1</tpEmis>
<cDV>3</cDV>
<tpAmb>1</tpAmb>
<finNFe>1</finNFe>
<indFinal>0</indFinal>
<indPres>9</indPres>
<indIntermed>0</indIntermed>
<procEmi>0</procEmi>
<verProc>7.4.121</verProc>
</ide>
<emit>
<CNPJ>05194398000168</CNPJ>
<xNome>BERNARDO ALIMENTOS INDUSTRIA E COMERCIO LTDA</xNome>
<xFant>BERNARDO ALIMENTOS</xFant>
<enderEmit>
<xLgr>ESTRADA ANEL VIARIO</xLgr>
<nro>640</nro>
<xBairro>SETOR ANEL VIARIO</xBairro>
<cMun>1100122</cMun>
<xMun>JI-PARANA</xMun>
<UF>RO</UF>
<CEP>76904398</CEP>
<cPais>1058</cPais>
<xPais>BRASIL</xPais>
<fone>6934223358</fone>
</enderEmit>
<IE>00000001117327</IE>
<CRT>3</CRT>
</emit>
<dest>
<CNPJ>43870602000102</CNPJ>
<xNome>A T DE C STRE LTDA</xNome>
<enderDest>
<xLgr>AVENIDA BRASIL</xLgr>
<nro>2459</nro>
<xBairro>CENTRO</xBairro>
<cMun>1100296</cMun>
<xMun>SANTA LUZIA D'OESTE</xMun>
<UF>RO</UF>
<CEP>76950000</CEP>
<cPais>1058</cPais>
<xPais>BRASIL</xPais>
<fone>69984100165</fone>
</enderDest>
<indIEDest>1</indIEDest>
<IE>00000006154735</IE>
<email>financeirojuninhosupermercado@hotmail.com</email>
</dest>
<det nItem="1">
<prod>
<cProd>188</cProd>
<cEAN>17897326100015</cEAN>
<xProd>ARROZ BERNARDO TIPO 1 6X5S</xProd>
<NCM>10063021</NCM>
<CFOP>5101</CFOP>
<uCom>FD</uCom>
<qCom>50.0000</qCom>
<vUnCom>90.0000000000</vUnCom>
<vProd>4500.00</vProd>
<cEANTrib>7896541201012</cEANTrib>
<uTrib>PCT</uTrib>
<qTrib>300.0000</qTrib>
<vUnTrib>15.0000000000</vUnTrib>
<indTot>1</indTot>
</prod>
<imposto>
<ICMS>
<ICMS00>
<orig>0</orig>
<CST>00</CST>
<modBC>3</modBC>
<vBC>4500.00</vBC>
<pICMS>19.50</pICMS>
<vICMS>877.50</vICMS>
</ICMS00>
</ICMS>
<IPI>
<cEnq>999</cEnq>
<IPINT>
<CST>51</CST>
</IPINT>
</IPI>
<PIS>
<PISNT>
<CST>06</CST>
</PISNT>
</PIS>
<COFINS>
<COFINSNT>
<CST>06</CST>
</COFINSNT>
</COFINS>
</imposto>
<infAdProd>/ UN TRIB: PCT / QTD TRIB: 300.0000 / PRECO TRIB: 15,00000.</infAdProd>
</det>
<total>
<ICMSTot>
<vBC>4500.00</vBC>
<vICMS>877.50</vICMS>
<vICMSDeson>0</vICMSDeson>
<vFCPUFDest>0</vFCPUFDest>
<vICMSUFDest>0</vICMSUFDest>
<vICMSUFRemet>0</vICMSUFRemet>
<vFCP>0</vFCP>
<vBCST>0</vBCST>
<vST>0</vST>
<vFCPST>0</vFCPST>
<vFCPSTRet>0</vFCPSTRet>
<qBCMonoRet>0</qBCMonoRet>
<vICMSMonoRet>0</vICMSMonoRet>
<vProd>4500.00</vProd>
<vFrete>0</vFrete>
<vSeg>0</vSeg>
<vDesc>0</vDesc>
<vII>0</vII>
<vIPI>0</vIPI>
<vIPIDevol>0</vIPIDevol>
<vPIS>0</vPIS>
<vCOFINS>0</vCOFINS>
<vOutro>0</vOutro>
<vNF>4500.00</vNF>
</ICMSTot>
<retTrib/>
</total>
<transp>
<modFrete>0</modFrete>
<transporta/>
<vol>
<qVol>50</qVol>
<esp>CXAS/FARDO</esp>
<pesoL>1500.000</pesoL>
<pesoB>1500.000</pesoB>
</vol>
</transp>
<cobr>
<fat>
<nFat>385250</nFat>
<vOrig>4500.00</vOrig>
<vDesc>0.00</vDesc>
<vLiq>4500.00</vLiq>
</fat>
<dup>
<nDup>001</nDup>
<dVenc>2025-08-20</dVenc>
<vDup>1125.00</vDup>
</dup>
<dup>
<nDup>002</nDup>
<dVenc>2025-08-27</dVenc>
<vDup>1125.00</vDup>
</dup>
<dup>
<nDup>003</nDup>
<dVenc>2025-09-03</dVenc>
<vDup>1125.00</vDup>
</dup>
<dup>
<nDup>004</nDup>
<dVenc>2025-09-10</dVenc>
<vDup>1125.00</vDup>
</dup>
</cobr>
<pag>
<detPag>
<indPag>1</indPag>
<tPag>15</tPag>
<vPag>4500.00</vPag>
</detPag>
</pag>
<infAdic>
<infCpl>ITEM 1 CLASSIFICACAO: RO000097-Z-8284 - LOTE 010 19/11/2024 Pedido: 178265</infCpl>
</infAdic>
<infRespTec>
<CNPJ>79500385000106</CNPJ>
<xContato>Suporte</xContato>
<email>suportenfe@consistem.com.br</email>
<fone>4721071880</fone>
</infRespTec>
</infNFe>
<protNFe>
<infProt>
<tpAmb>1</tpAmb>
<verAplic>SP_NFE_PL_009</verAplic>
<chNFe>11250705194398000168550010003852501369118583</chNFe>
<dhRecbto>2025-07-30T11:54:00-03:00</dhRecbto>
<nProt>123456789012345</nProt>
<digVal>4Mf5ZiboYm/kSiuaWB2TRYAXIcY=</digVal>
<cStat>100</cStat>
<xMotivo>Autorizado o uso da NF-e</xMotivo>
</infProt>
</protNFe>
</nfeProc>
`;

const testService = {
    /**
     * Executa um teste de averbação para uma nota específica do banco de dados,
     * usando um XML pré-definido no serviço.
     * @param {number} logId - O ID da nota na tabela averbacoes_log a ser testada.
     * @returns {Promise<object>} O resultado da averbação.
     */
    runTestAverbacao: async (logId) => {
        console.log(`\n--- INICIANDO TESTE DE AVERBAÇÃO MANUAL PARA LOG ID: ${logId} ---`);
        try {
            // 1. Buscar a nota no banco de dados
            const nota = await averbacaoLogModel.findById(logId); // Assumindo que findById existe no model
            if (!nota) {
                const msg = `Nota com ID ${logId} não encontrada no banco de dados.`;
                console.error(`   ${msg}`);
                return { success: false, message: msg };
            }
            console.log(`   Nota encontrada no DB: ${nota.numero_nota}, Status: ${nota.status}`);

            // 2. Simular a obtenção do XML (usando o XML setado diretamente)
            const nfeXml = SAMPLE_NFE_XML;
            if (!nfeXml) {
                const msg = 'XML de teste não está definido no testService.';
                console.error(`   ${msg}`);
                await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', msg);
                return { success: false, message: msg };
            }
            console.log(`   XML de teste carregado para nota ${nota.numero_nota}.`);

            // 3. Enviar o XML para a AT&M
            let averbacaoResult;
            try {
                averbacaoResult = await atmService.averbarNFe(nfeXml);
            } catch (atmError) {
                // Lógica de reautenticação em caso de token expirado
                if (atmError.message.includes('Token expirado') || (atmError.response && atmError.response.data && atmError.response.data.Codigo === '915')) {
                    console.log('   AT&M Token expirado durante o teste. Tentando reautenticar e re-enviar...');
                    try {
                        await atmService.authenticate(); // Força nova autenticação
                        averbacaoResult = await atmService.averbarNFe(nfeXml); // Tenta enviar novamente
                    } catch (retryError) {
                        const msg = `Falha na reautenticação ou re-envio durante o teste: ${retryError.message}`;
                        console.error(`   ${msg}`);
                        await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', msg);
                        return { success: false, message: msg };
                    }
                } else {
                    const msg = `Erro inesperado da AT&M durante o teste: ${atmError.message}`;
                    console.error(`   ${msg}`);
                    await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', msg);
                    return { success: false, message: msg };
                }
            }
            
            // 4. Atualizar o status da averbação no log
            if (averbacaoResult.success) {
                const protocolo = averbacaoResult.data.Averbado?.Protocolo || 'N/A';
                const numAverbacao = averbacaoResult.data.Averbado?.DadosSeguro?.[0]?.NumeroAverbacao || 'N/A';
                const msgSucesso = `Averbada. Protocolo AT&M: ${protocolo}. Nº Averb: ${numAverbacao}`;
                console.log(`   Nota ${nota.numero_nota} AVERBADA com sucesso no teste. Protocolo: ${protocolo}`);
                await averbacaoLogModel.updateStatus(nota.id, 'AVERBADA', msgSucesso);
                return { success: true, message: msgSucesso, data: averbacaoResult.data };
            } else {
                const msgErro = `Erro AT&M retornado no teste: ${averbacaoResult.message || 'Detalhes no log.'}`;
                console.error(`   ${msgErro}`);
                await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', msgErro);
                return { success: false, message: msgErro, data: averbacaoResult.data };
            }

        } catch (error) {
            const msgErroGeral = `ERRO GERAL NO TESTE DE AVERBAÇÃO para nota ID ${logId}: ${error.message}`;
            console.error(`   ${msgErroGeral}`);
            // Tenta atualizar o status mesmo em caso de erro geral, se a nota foi encontrada
            if (nota && nota.id) {
                await averbacaoLogModel.updateStatus(nota.id, 'ERRO_AVERBACAO', msgErroGeral);
            }
            return { success: false, message: msgErroGeral };
        } finally {
            console.log(`--- FIM DO TESTE DE AVERBAÇÃO MANUAL PARA LOG ID: ${logId} ---\n`);
        }
    }
};

module.exports = testService;
