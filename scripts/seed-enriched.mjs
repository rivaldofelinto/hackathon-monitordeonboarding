/**
 * seed-enriched.mjs — inserts active vistoria + fotografia records with rich fields
 * Run: node scripts/seed-enriched.mjs
 *
 * These are NEW records (IDs 1.3xx billion) not present in the original seed.
 * Uses INSERT ... ON CONFLICT (codigo_imovel) DO UPDATE to upsert.
 */

import pg from "pg";
const { Client } = pg;

const DATABASE_URL =
  "postgresql://neondb_owner:npg_osIrJCPyg8q5@ep-proud-base-anmzzik8-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

// Parse "DD/MM/YYYY" → "YYYY-MM-DD" for ISO date storage
function parseBRDate(br) {
  if (!br || br.length < 10) return null;
  const parts = br.split("/");
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

// Clean analista field: may be JSON array like ["Name"] or plain string
function cleanAnalista(raw) {
  if (!raw) return "";
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw.replace(/'/g, '"'));
      return Array.isArray(arr) ? arr.join(", ") : raw;
    } catch {
      return raw.replace(/[\[\]"]/g, "").trim();
    }
  }
  return raw.trim();
}

// Active Vistoria records (pipe 3 - Vistoria, table 302290867)
// Phases: Fase 0, Fase 1, Fase 2, Stand-by
const VISTORIA_RECORDS = [
  ["1328803605","MDR0208","Fase 1 - Agendamento","","Juliana Lemos da Silva","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1T7AWtbwsOlPhbeyb7uyR-rvTaDNtLVxK"],
  ["1328712857","CTD0402","Fase 2 - Agendada","02/04/2026"," Ana Paula Friedrich de Oliveira","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1IcWnX_eZN4HXpX2_nKr7KbL_2dEJbyR5"],
  ["1328707673","HPA0202","Stand-by","","Lucas Sena da Silva","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1sT201BEGZppJgPYcZc9F4eefzqUaKW5r"],
  ["1328689900","SOG0104","Stand-by","","Jéssica Schirley Sibilio Dutra Jordão Macedo","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1lG0S7uRt45F7b06rkrOBgWgl9Z31erCp"],
  ["1328540469","JOG0201","Fase 1 - Agendamento","","Luanda Tavares Santana","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1VhWc6xVGEsvYTEvdJSATbTFFTHP5jCjm"],
  ["1328095055","NWT1017","Fase 1 - Agendamento","","Camila Moura Lacerda","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1GY3iJfaICtwmiZrMBt_RZNRXnR4kw-sC"],
  ["1328071892","TDP1001","Stand-by","","Rael Michaelsen","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1ydTYorSOTs1TTgyP7RwFfFvPJR9Rex8h"],
  ["1328065216","SKL0907","Fase 1 - Agendamento","","Edite Alves","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1BKa5uzKWludUecdW9Ih9Tc9Po8dt1sdF"],
  ["1327950088","TPS209","Fase 2 - Agendada","08/04/2026","Erion Xhafaj","","Imovel ativo sem vistoria",""],
  ["1327950071","TPS202","Fase 2 - Agendada","08/04/2026","Erion Xhafaj","","Imovel ativo sem vistoria",""],
  ["1327950056","TPS201","Fase 2 - Agendada","08/04/2026","Erion Xhafaj","","Imovel ativo sem vistoria",""],
  ["1327313008","MOA0102","Stand-by","","Izana Serra Lima","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1LePNduzOCk4KfUf8bITppeDMUxJdmkNu"],
  ["1327264615","ENT0102","Stand-by","","Andreia Real da Rosa","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1-0j-kWzSytp4rl1cAmCxC5MqOT_c-S2X"],
  ["1327084992","CDA1647","Stand-by","","Luís Eduardo Oliveira Machado","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1F4IuDYpqanR11XIWugZ7n78esbs0vL5S"],
  ["1327056997","VAO1029","Stand-by","","Seazone Goiânia","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/10GpDeLwfsKqt_4H4A_W1DqZ0hvz9ozLB"],
  ["1327027507","VOAO0000","Fase 2 - Agendada","02/04/2026","Driely Lohanne Constantino","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1bwTuctVevL9fcxGHi19sMFeK8Jc4QYcB"],
  ["1327019592","IBV0013","Stand-by","","Erica Bianca da Silva","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1pvZXgi4voOJkci4gjQ6tM-Is4acFO12R"],
  ["1326973361","RPB0047","Fase 2 - Agendada","01/04/2026","Coninte Comercio Imoveis LTDA","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1WXBcLLGuzaRqKDWO6llGxAuWJTqWX3n6"],
  ["1326962695","RPB0046","Fase 2 - Agendada","01/04/2026","Coninte Comercio Imoveis LTDA","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1jJtXJoW3ZzSYHbLwqMswXwsCNwjCn8w6"],
  ["1325723467","CLZB0504","Stand-by","","Fernanda Kieling Kist","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1iSdOApgeMGRZwRYHiJTdSDFkGAq49EuQ"],
  ["1325701906","CEU0001","Stand-by","","Lucilene Cora","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1Qcbl0Cwkm43n3wV9vPTIdIpEGGlGApL3"],
  ["1325000618","UNE1105","Stand-by","","Dreicom Adolfo Neckel Wolter","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1AJB6AHK3XcLN1RyxhqUxgsPzJcF6jnEi"],
  ["1324992892","VGE0303","Stand-by","","Dreicom Adolfo Neckel Wolter","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1MRXTKNkeL_a2J6aKvc0rwmvy869gv_fy"],
  ["1324948371","HAI0203","Fase 2 - Agendada","08/04/2026","Renata Maria Cerqueira","","Migração de Franquia",""],
  ["1324945723","SEM0302","Fase 2 - Agendada","07/04/2026","Fernanda Kieling Kist","","Migração de Franquia",""],
  ["1324944020","KNU0170","Fase 2 - Agendada","07/04/2026","Stefanie Maria Castro","","Migração de Franquia",""],
  ["1324942318","ESM602","Fase 2 - Agendada","03/04/2026","Fernanda Kieling Kist","","Migração de Franquia",""],
  ["1324934316","CRM0212","Fase 2 - Agendada","02/04/2026","Stefanie Maria Castro","","Migração de Franquia",""],
  ["1324933385","CRM0201","Fase 2 - Agendada","02/04/2026","Stefanie Maria Castro","","Migração de Franquia",""],
  ["1324898133","LHD0403","Stand-by","","Seazone Goiânia","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1NX2jPeHKaM8-I7q1dJojQyKjtNVt5vVK"],
  ["1324881358","ZBA1202","Fase 2 - Agendada","02/04/2026","Tiago dos Santos e Santos","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/11Fy6Edbontf3VDv7NeoRFCTDgOplMlca"],
  ["1324869804","RGF0508","Stand-by","","Roberta de Freitas Costa","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1gjjULbX_7COYmdkn-gIVhq3upCBFWv17"],
  ["1324845807","DIL0103","Stand-by","","Marcela S Gambelli","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1AS38bPj-yS2QBEZokexqKmO-PHMaQWCW"],
  ["1324808445","JFN0102","Stand-by","","Jaciane Melo Graciliano","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1t0mw1tS8D64oWqUjRrY0wnbCp-ekWDgB"],
  ["1324136303","EYS2307","Stand-by","","Cingridi Cristina Mariano","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1eBTnk9I_NGBM_pYrxqfxUjnyw5UUSRag"],
  ["1323402283","SPT0507","Fase 2 - Agendada","13/04/2026","Dreicom Adolfo Neckel Wolter","","Imovel ativo sem vistoria",""],
  ["1323402266","SPT0301","Fase 2 - Agendada","13/04/2026","Dreicom Adolfo Neckel Wolter","","Imovel ativo sem vistoria",""],
  ["1323402251","SPT0208","Fase 2 - Agendada","13/04/2026","Dreicom Adolfo Neckel Wolter","","Imovel ativo sem vistoria",""],
  ["1320755343","TSO0313","Stand-by","","Camila Bresolin Pereira","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1NgHTrqI6io0ISQAJ9Gd2KtgTXqHAN-8H"],
  ["1320467718","SPH0005","Stand-by","","Lucilene Cora","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1nfJZgldd_W2ZccRWmqelbqyd_nxDqJLH"],
  ["1319957623","LON0397","Fase 2 - Agendada","02/04/2026","Renata Maria Cerqueira","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1UjDkX5rVfHg49xPGJa0pperJjGjerCLV"],
  ["1319929300","VIA0302","Stand-by","","Renata Maria Cerqueira","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1LAHvMKi32sa_rkZN_3mY28fjLOZhmHWv"],
  ["1319811661","TSO0314","Stand-by","","Camila Bresolin Pereira","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1YmzZVwdMYjlknHkoLk7e7_z75nxyJHRr"],
  ["1319253853","LPK0302","Stand-by","","Cassiana Outeiro","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1j-jFERrPjWtJjPKdA-GVqToIPyOL97np"],
  ["1319111223","PKD0102","Stand-by","","Marcela S Gambelli","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1ZFaMPd1WwtGZhvrcoNBDDerGtu3OvuTQ"],
  ["1318899013","PTE0508","Fase 2 - Agendada","06/04/2026","Nabiha Kasmas Denis","","Migração de Franquia",""],
  ["1318631061","GEN0102","Fase 2 - Agendada","16/04/2026","Jaciane Melo Graciliano","","Migração de Franquia",""],
  ["1318630873","STL401","Fase 1 - Agendamento","","Reinaldo Jorge Fernandes","","Migração de Franquia",""],
  ["1318627000","VTR0033","Fase 2 - Agendada","17/04/2026","Reinaldo Jorge Fernandes","","Migração de Franquia",""],
  ["1318626206","EJS0803","Fase 2 - Agendada","02/04/2026","Jaciane Melo Graciliano","","Migração de Franquia",""],
  ["1318443719","NOR0204","Stand-by","","Madego DF Ativos","","Imovel ativo sem vistoria",""],
  ["1318443701","NOR0203","Stand-by","","Madego DF Ativos","","Imovel ativo sem vistoria",""],
  ["1318443667","NOR0101","Stand-by","","Madego DF Ativos","","Imovel ativo sem vistoria",""],
  ["1318288351","DIL1005","Stand-by","","Marcela S Gambelli","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1sV4iKqa_nsbPw5D-x7nfqvmp8G11Qia1"],
  ["1315749798","ALV0203","Stand-by","","Juliana Lemos da Silva","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1eXKSwrQCYeaYYmkiImD6cIOkqwC_7a8J"],
  ["1314895513","EUB1006","Fase 2 - Agendada","03/04/2026","Renata Maria Cerqueira","","Migração de Franquia",""],
  ["1313224397","SMA0206","Fase 2 - Agendada","02/04/2026","Maria Carolina de Rodrigues de Souza","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1U7PCvHj4lyJivCd6BU1qLe8SPIYD-0Bk"],
  ["1313146880","SCR0316","Stand-by","","Roberta de Freitas Costa","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/10xwoAJaLdx4-p5J4OftkQSBe7UbVLNas"],
  ["1312843066","IDE0765","Stand-by","","À Definir","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1ykvV0WRg92qPP8T9IgC9HqCpYV_nq0wW"],
  ["1310532050","NOS0201","Fase 0 - Início","","Ricardo Portella Junior","","",""],
  ["1310002392","LPA0504","Stand-by","","Dhennyfer Rosa de Almeida","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/17V_xj88q9EwqUzMiXDohiZJ5C8QhGZvB"],
  ["1309701501","VBA0516","Stand-by","","Giselia Soares da Silva","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1nM8A5qiDUorOzm3EgKwbUaT27euNzvye"],
  ["1309360587","FDM0101","Stand-by","","Rael Michaelsen","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/13FtnGG4vuToA4zM0-y09b2h9CjWY0yyN"],
  ["1309320269","FLA0701","Stand-by","","Renata Maria Cerqueira","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1wEOVMeX6XJBtWAkMiQf0U3X-_fQ8cC7b"],
  ["1308499196","BMC0508","Stand-by","","Fábio Moreira Campos Monteiro","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1HzmZsN8EP2t49Ag2sJP54jDcEwytsZQ2"],
  ["1308283615","DNAG0503","Stand-by","","Seazone Goiânia","Ana Carolina de Matos","Solicitação seazone","https://drive.google.com/drive/folders/1T9_1rxTgGcN2o5nKrCLR8tJ_PRFh_oRk"],
  ["1304623815","BVR0102","Fase 2 - Agendada","02/04/2026","Dhennyfer Rosa de Almeida","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1BB6HyUsq3wuTJHbyrQkzuVaP60HWcfcp"],
  ["1300375534","NER0916","Stand-by","","Caroline Sorondo Vaghetti","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1_32mwjNyzFbA9JGt69IWAj62oopBj_x0"],
  ["1299807864","LHC1303","Stand-by","","Thiago Rodrigues Pinto","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1PLSdv3_fD_1Nxr26aWvF3r_7LNzK1OnX"],
  ["1295890238","GNB0177","Stand-by","","Kathellyne Soares","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/11hS2Va6ioxVidc0mgfoOTYbTypXrAN8p"],
  ["1292735887","FLU0007","Stand-by","","Gustavo Henrique de Barros Silva","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1MAdJBDeLslazLwX5EdvE5PmoQtvngexV"],
  ["1289830408","LSO0816","Stand-by","","Naihana Loyola","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/19rXefSeViIQXA3H_kmkUK6RRP5YgGiVl"],
  ["1288151399","CDW0102","Stand-by","","Luanda Tavares","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1BgnJiXQbjQ2VtsG-JKlRW7psOYIG_FzP"],
  ["1286704895","JGW0006","Stand-by","","Luan Navarro","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1IS7T8fe4__HbDeYhp16jciTtdNn3rF8z"],
  ["1273243085","RZA0020","Stand-by","","Lucilene Cora","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/16m2vhALTCHcsaaQ5oAUBGjqEUQ2lBF2Q"],
  ["1258548808","RSO0015","Stand-by","","Jeferson Luis Fernandes","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1Hnpl-eACKzkD-PFfaNYcRmckzVWbuAq9"],
  ["1252571869","RAM0004","Stand-by","","Maria Carolina de Rodrigues de Souza","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/1Je3y00bCWfH-n5ab9YyE_ixR7vGdSwaL"],
  ["1252567559","RAM0003","Stand-by","","MARIA CAROLINA DE RODRIGUES DE SOUZA","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/12uaN7Q-_AG0mGIvzHHfvaKqDxwmNhqTj"],
  ["1252567184","RAM0002","Stand-by","","MARIA CAROLINA DE RODRIGUES DE SOUZA","Bruna Fernanda dos Santos","Solicitação seazone","https://drive.google.com/drive/folders/19AoHPK5eqCiYlEutgRwsjXqdf_STMmZL"],
  ["1226326488","NÉO0186","Stand-by","","Carlos Eduardo Inacio Diniz","Caroline Silva Seixas Leite","Solicitação seazone","https://drive.google.com/drive/folders/1Y18z2C1Cph8JhnU2YFp6pu_YySMNqTp4"],
  ["1213420885","HES0109","Stand-by","","MARIA CAROLINA DE RODRIGUES DE SOUZA","Caroline Silva Seixas Leite","Solicitação seazone","https://drive.google.com/drive/folders/1liVyZRJ_-BwebshzMhHbNdfp6BY5h4DO"],
  ["1213419948","HES0701","Stand-by","","MARIA CAROLINA DE RODRIGUES DE SOUZA","Caroline Silva Seixas Leite","Solicitação seazone","https://drive.google.com/drive/folders/1C98QTd5_2r1HuJVAHS6mlX8DHzNzcPLV"],
];

// Active Fotografia records (pipe 4 - Fotografia, table 302290880, done=false)
// [id, title, phase, turno]
const FOTOGRAFIA_RECORDS = [
  ["1328844378","VIO0312","Fase 2 - Contato Fotógrafo","Tarde"],
  ["1328733019","GRLA1303","Fase 1 - Contato Franquia",""],
  ["1328728413","POR0105","Fase 5 - Análise de Fotos",""],
  ["1328667732","HVE0201","Fase 1 - Contato Franquia",""],
  ["1328594483","SLI1013","Fase 1 - Contato Franquia",""],
  ["1327978853","MAA0002","Fase 4 - Realizadas","Tarde"],
  ["1327869617","FDS0303","Fase 1 - Contato Franquia",""],
  ["1327844721","SRB0101","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1327836161","GVM0315","Fase 3 - Agendadas","Manhã"],
  ["1327783695","ILC1209","Fase 3 - Agendadas","Tarde"],
  ["1327783202","VIO1409","Fase 2 - Contato Fotógrafo","Tarde"],
  ["1327749403","VIO1810","Fase 2 - Contato Fotógrafo","Tarde"],
  ["1327266527","VGT0603","Fase 3 - Agendadas","Manhã"],
  ["1327265957","RPI0110","Fase 3 - Agendadas","Manhã"],
  ["1327226358","OKA111","Fase 1.2 - Imóveis Ativos",""],
  ["1327224965","OKA120","Fase 1.2 - Imóveis Ativos",""],
  ["1327195015","VLP0106","Fase 3 - Agendadas","Manhã"],
  ["1327179691","PON0302","Fase 3 - Agendadas","Tarde"],
  ["1327117012","IRAI0307","Fase 4 - Realizadas","Tarde"],
  ["1327116383","JDN0213","Fase 3 - Agendadas","Manhã"],
  ["1327042096","UPP0104","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1325858056","GET0805","Fase 1 - Contato Franquia",""],
  ["1325798448","VLM0228","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1325697542","DGA0204","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1325696804","SAN0006","Fase 3 - Agendadas","Manhã"],
  ["1324973293","THO2907","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1324972478","NSZ0194","Fase 4 - Realizadas","Manhã"],
  ["1324883065","EKT002","Fase 1.2 - Imóveis Ativos",""],
  ["1324882452","MCU0103","Fase 3 - Agendadas","Manhã"],
  ["1324270700","BDL0003","Fase 3 - Agendadas","Manhã"],
  ["1324195441","JDN0911","Fase 3 - Agendadas","Manhã"],
  ["1324186390","CCN0169","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1324158627","ILP0801","Fase 4 - Realizadas","Manhã"],
  ["1324158064","RAM0001","Fase 4 - Realizadas","Tarde"],
  ["1324057488","PIU0105","Fase 1 - Contato Franquia",""],
  ["1324056857","PSP0107","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1323418261","OLA0005","Fase 7 - Conferência de Anúncios",""],
  ["1323417043","OLA0006","Fase 7 - Conferência de Anúncios",""],
  ["1323414271","OLA0004","Fase 7 - Conferência de Anúncios",""],
  ["1323387351","RSO0035","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1323386586","SAK0819","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1323308953","PSP0809","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1323295537","PAM0607","Fase 4 - Realizadas","Tarde"],
  ["1323278905","SMT0207","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1323180774","ILG0307","Fase 4 - Realizadas","Manhã"],
  ["1321329576","CAI0211","Fase 3 - Agendadas","Manhã"],
  ["1321279958","BRS2405","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1320697302","IBA0401","Fase 1 - Contato Franquia",""],
  ["1320577705","BLI2903","Fase 3 - Agendadas","Tarde"],
  ["1320501706","BRS2170","Fase 3 - Agendadas","Tarde"],
  ["1318418654","OBD1401","Fase 5 - Análise de Fotos","Tarde"],
  ["1318417420","OBD1501","Fase 5 - Análise de Fotos","Tarde"],
  ["1318294748","VBX10618","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1316545990","ING0023","Fase 3 - Agendadas","Manhã"],
  ["1316510805","HPA0904","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1314488808","WSL0408","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1312807428","LPK0302","Fase 7 - Conferência de Anúncios","A definir"],
  ["1312805870","JNE0343","Fase 4 - Realizadas","Manhã"],
  ["1309521398","PDAA0304","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1308082474","GRLB0903","Fase 1.2 - Imóveis Ativos",""],
  ["1303377884","SAA0118","Fase 1 - Contato Franquia",""],
  ["1303254742","SBH0233","Refazer Fotos",""],
  ["1303246950","GRLB1803","Fase 1.2 - Imóveis Ativos",""],
  ["1297453155","MBCA1704","Fase 1.2 - Imóveis Ativos",""],
  ["1297063740","CPI0208","Fase 1.2 - Imóveis Ativos",""],
  ["1295732423","GRLB1505","Fase 1.2 - Imóveis Ativos",""],
  ["1291082196","MCB0302","Refazer Fotos",""],
  ["1288997820","GRLA1802","Fase 1.2 - Imóveis Ativos",""],
  ["1288281734","HCY2310","Fase 1.2 - Imóveis Ativos","A definir"],
  ["1286451497","MSST1001","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1285937696","AEM0004","Fase 3 - Agendadas","Manhã"],
  ["1284683883","FNK1905","Fase 1.2 - Imóveis Ativos",""],
  ["1284103807","CDI0042","Fase 1 - Contato Franquia",""],
  ["1283844698","JDN0216","Fase 1 - Contato Franquia",""],
  ["1281771940","MFE2202","Fase 1.2 - Imóveis Ativos","Tarde"],
  ["1281316805","SBH0237","Fase 1.2 - Imóveis Ativos",""],
  ["1276460752","ZNB1508","Fase 7 - Conferência de Anúncios","Tarde"],
  ["1275630227","MAP1408","Fase 3 - Agendadas","Tarde"],
  ["1271999877","CAE0103","Fase 1.2 - Imóveis Ativos",""],
  ["1271345489","CPF0902","Fase 1.2 - Imóveis Ativos","Tarde"],
  ["1267683697","CDD0077","Fase 1 - Contato Franquia","Manhã"],
  ["1265271273","EBM0122","Fase 4 - Realizadas","Manhã"],
  ["1263575202","LIU1606","Fase 7 - Conferência de Anúncios","Manhã"],
  ["1259351605","SVM1310","Fase 1 - Contato Franquia",""],
];

async function main() {
  const client = new Client(DATABASE_URL);
  await client.connect();
  console.log("Connected to Neon");

  let inserted = 0;
  let skipped = 0;

  // Insert vistoria records
  console.log(`\nInserting ${VISTORIA_RECORDS.length} vistoria records...`);
  for (const [id, title, phase, data_vistoria, franquia, analista, tipo_vistoria, link_fotos] of VISTORIA_RECORDS) {
    const isoDate = parseBRDate(data_vistoria);
    const updatedAt = isoDate ? new Date(isoDate) : new Date();
    const metadata = {
      pipe: "3",
      pipe_name: "Pipe 3 - Vistoria",
      title,
      phase,
      late: false,
      done: false,
      franquia: franquia.trim(),
      analista: cleanAnalista(analista),
      data_vistoria,
      tipo_vistoria,
      link_fotos,
      link_pipefy: `https://app.pipefy.com/pipes/302290867#cards/${id}`,
    };

    try {
      await client.query(
        `INSERT INTO properties (codigo_imovel, endereco, cidade, uf, status, metadata, created_at, updated_at)
         VALUES ($1, '', '', '', 'active', $2, $3, $3)
         ON CONFLICT (codigo_imovel) DO UPDATE SET metadata = $2, updated_at = $3`,
        [id, JSON.stringify(metadata), updatedAt]
      );
      inserted++;
    } catch (e) {
      console.error(`Failed ${id}: ${e.message}`);
      skipped++;
    }
  }

  // Insert fotografia records
  console.log(`\nInserting ${FOTOGRAFIA_RECORDS.length} fotografia records...`);
  for (const [id, title, phase, turno] of FOTOGRAFIA_RECORDS) {
    const metadata = {
      pipe: "4",
      pipe_name: "Pipe 4 - Fotografia",
      title,
      phase,
      late: false,
      done: false,
      turno,
      link_pipefy: `https://app.pipefy.com/pipes/302290880#cards/${id}`,
    };

    try {
      await client.query(
        `INSERT INTO properties (codigo_imovel, endereco, cidade, uf, status, metadata, created_at, updated_at)
         VALUES ($1, '', '', '', 'active', $2, NOW(), NOW())
         ON CONFLICT (codigo_imovel) DO UPDATE SET metadata = $2, updated_at = NOW()`,
        [id, JSON.stringify(metadata)]
      );
      inserted++;
    } catch (e) {
      console.error(`Failed ${id}: ${e.message}`);
      skipped++;
    }
  }

  await client.end();
  console.log(`\nDone: ${inserted} inserted/updated, ${skipped} failed`);
}

main().catch(console.error);
