/**
 * Seed script — loads real Nekt data into Neon
 * Data sourced from pipefy_szs_all_cards_303781436 (PIPE 1 - Implantação/Mãe)
 * Run: node scripts/seed-nekt.mjs
 */

import pg from "pg";
const { Client } = pg;

const DATABASE_URL =
  "postgresql://neondb_owner:npg_osIrJCPyg8q5@ep-proud-base-anmzzik8-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

// Fase → stage config
const PHASE_MAP = {
  "Fase 0 - StandBy/Reforma/Construção": { number: 1, status: "blocked" },
  "Fase 2 - Setup Interno": { number: 2, status: "in_progress" },
  "Fase 3 -  Vistoria Inicial": { number: 3, status: "in_progress" },
  "Fase 5 - Adequação/ Enxoval": { number: 5, status: "in_progress" },
  "Fase 7 - Revisão/Limpeza/Fotos amadoras": { number: 7, status: "in_progress" },
  "Fase 8 - Ativação de Anúncio": { number: 8, status: "in_progress" },
  "Fase 9 - Fotografia": { number: 9, status: "in_progress" },
  "Fase 10 - Pendências + Registro vistoria no SAPRON": { number: 10, status: "in_progress" },
};

// Real data from Nekt MCP (2026-04-02)
const NEKT_DATA = [
  ["1291715321","BDL0003","Fase 8 - Ativação de Anúncio","2026-02-02T11:30:48Z","2026-04-01T15:01:15Z","false","false"],
  ["1303290066","BRS2405","Fase 8 - Ativação de Anúncio","2026-02-24T19:39:17Z","2026-04-01T15:01:05Z","false","false"],
  ["1303997752","CCN0169","Fase 8 - Ativação de Anúncio","2026-02-25T16:30:17Z","2026-04-01T14:51:49Z","false","false"],
  ["1324775046","ILC1209","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-26T11:54:13Z","2026-04-01T14:45:50Z","false","false"],
  ["1318360940","PSP0809","Fase 8 - Ativação de Anúncio","2026-03-16T16:30:21Z","2026-04-01T14:41:35Z","false","false"],
  ["1303834671","CEP00427","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-02-25T13:30:17Z","2026-04-01T14:40:21Z","false","false"],
  ["1309349036","VGT0603","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-04T20:30:32Z","2026-04-01T14:38:31Z","false","false"],
  ["1313684642","CEP0226","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-03-10T12:30:26Z","2026-04-01T14:34:49Z","false","false"],
  ["1316693676","IBA0401","Fase 8 - Ativação de Anúncio","2026-03-13T19:30:21Z","2026-04-01T14:24:21Z","false","false"],
  ["1292219977","PBS0102","Fase 8 - Ativação de Anúncio","2026-02-02T22:30:27Z","2026-04-01T14:23:54Z","false","false"],
  ["1292219962","PBS0101","Fase 8 - Ativação de Anúncio","2026-02-02T22:30:24Z","2026-04-01T14:23:31Z","false","false"],
  ["1257160895","CUO0114","Fase 8 - Ativação de Anúncio","2025-11-19T20:30:29Z","2026-04-01T14:23:00Z","false","false"],
  ["1328118347","JOG0201","Fase 3 -  Vistoria Inicial","2026-03-31T21:30:18Z","2026-04-01T14:22:51Z","false","false"],
  ["1292099968","SMT0207","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-02-02T19:30:30Z","2026-04-01T14:20:53Z","false","false"],
  ["1186681457","EKT002","Fase 8 - Ativação de Anúncio","2025-08-01T00:30:19Z","2026-04-01T14:15:22Z","false","false"],
  ["1215233432","GRLA1203","Fase 2 - Setup Interno","2025-09-16T14:30:47Z","2026-04-01T14:09:31Z","false","false"],
  ["1215233124","GRLA1803","Fase 2 - Setup Interno","2025-09-16T14:30:28Z","2026-04-01T14:08:19Z","false","false"],
  ["1324774196","CUMD0003","Fase 5 - Adequação/ Enxoval","2026-03-26T11:53:13Z","2026-04-01T14:00:46Z","false","false"],
  ["1215232957","GRLB1302","Fase 2 - Setup Interno","2025-09-16T14:30:19Z","2026-04-01T13:58:46Z","false","false"],
  ["1038171698","FFS0502","Fase 2 - Setup Interno","2024-11-29T17:32:03Z","2026-04-01T13:56:57Z","false","false"],
  ["1038171755","FFS0503","Fase 2 - Setup Interno","2024-11-29T17:32:06Z","2026-04-01T13:55:50Z","false","false"],
  ["1182157345","HLT0104","Fase 2 - Setup Interno","2025-07-23T20:30:18Z","2026-04-01T13:54:27Z","false","false"],
  ["1215233395","GRLA1303","Fase 3 -  Vistoria Inicial","2025-09-16T14:30:44Z","2026-04-01T13:52:48Z","true","false"],
  ["1182157495","HLT0210","Fase 2 - Setup Interno","2025-07-23T20:30:22Z","2026-04-01T13:52:26Z","false","false"],
  ["1182506769","HLT0201","Fase 2 - Setup Interno","2025-07-24T13:30:17Z","2026-04-01T13:43:11Z","false","false"],
  ["1278707771","MCU0103","Fase 8 - Ativação de Anúncio","2026-01-08T13:30:23Z","2026-04-01T13:42:25Z","false","false"],
  ["1252757409","HLT0207","Fase 2 - Setup Interno","2025-11-10T15:30:24Z","2026-04-01T13:36:24Z","false","false"],
  ["1324774391","MOE0406","Fase 2 - Setup Interno","2026-03-26T11:53:31Z","2026-04-01T13:34:46Z","false","false"],
  ["1320385246","PUE0308","Fase 5 - Adequação/ Enxoval","2026-03-19T12:30:21Z","2026-04-01T13:33:15Z","false","false"],
  ["1132832178","KVI0101","Fase 2 - Setup Interno","2025-04-30T17:30:14Z","2026-04-01T13:32:49Z","false","false"],
  ["1132832250","KVI0102","Fase 2 - Setup Interno","2025-04-30T17:30:18Z","2026-04-01T13:30:50Z","false","false"],
  ["1325586002","GVM0315","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-27T12:30:10Z","2026-04-01T13:30:27Z","false","false"],
  ["1132832382","KVI0104","Fase 2 - Setup Interno","2025-04-30T17:30:25Z","2026-04-01T13:30:20Z","false","false"],
  ["1132832435","KVI0201","Fase 2 - Setup Interno","2025-04-30T17:30:28Z","2026-04-01T13:29:48Z","false","false"],
  ["1318426541","PSP0107","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-03-16T17:30:22Z","2026-04-01T13:29:19Z","false","false"],
  ["1132832494","KVI0202","Fase 2 - Setup Interno","2025-04-30T17:30:31Z","2026-04-01T13:29:04Z","false","false"],
  ["1132832668","KVI0204","Fase 2 - Setup Interno","2025-04-30T17:30:39Z","2026-04-01T13:28:32Z","false","false"],
  ["1132832728","KVI0207","Fase 2 - Setup Interno","2025-04-30T17:30:42Z","2026-04-01T13:28:03Z","false","false"],
  ["1132832795","KVI0302","Fase 2 - Setup Interno","2025-04-30T17:30:46Z","2026-04-01T13:27:28Z","false","false"],
  ["1132832864","KVI0303","Fase 2 - Setup Interno","2025-04-30T17:30:49Z","2026-04-01T13:26:53Z","false","false"],
  ["1132833039","KVI0401","Fase 2 - Setup Interno","2025-04-30T17:30:58Z","2026-04-01T13:26:13Z","false","false"],
  ["1132833138","KVI0404","Fase 2 - Setup Interno","2025-04-30T17:31:04Z","2026-04-01T13:25:34Z","false","false"],
  ["1132833193","KVI0407","Fase 2 - Setup Interno","2025-04-30T17:31:07Z","2026-04-01T13:23:37Z","false","false"],
  ["1141476682","KVI0105","Fase 2 - Setup Interno","2025-05-14T17:42:35Z","2026-04-01T13:22:53Z","false","false"],
  ["1203602434","HGR0509","Fase 2 - Setup Interno","2025-08-28T13:30:37Z","2026-04-01T13:18:24Z","false","false"],
  ["1215233469","GRLB1102","Fase 2 - Setup Interno","2025-09-16T14:30:49Z","2026-04-01T13:17:13Z","false","false"],
  ["1319425609","TSO0313","Fase 3 -  Vistoria Inicial","2026-03-17T22:30:20Z","2026-04-01T13:16:05Z","true","false"],
  ["1309135349","LPA0504","Fase 3 -  Vistoria Inicial","2026-03-04T13:30:17Z","2026-04-01T13:15:53Z","true","false"],
  ["1324774784","RPB0046","Fase 3 -  Vistoria Inicial","2026-03-26T11:53:58Z","2026-04-01T13:14:44Z","true","false"],
  ["1307418797","DNAG0503","Fase 3 -  Vistoria Inicial","2026-03-02T21:30:19Z","2026-04-01T13:14:25Z","true","false"],
  ["1324774884","CEU0001","Fase 3 -  Vistoria Inicial","2026-03-26T11:54:04Z","2026-04-01T13:13:49Z","true","false"],
  ["1325747021","VOD0000","Fase 3 -  Vistoria Inicial","2026-03-27T15:30:18Z","2026-04-01T13:13:27Z","true","false"],
  ["1324774843","RPB0047","Fase 3 -  Vistoria Inicial","2026-03-26T11:54:02Z","2026-04-01T13:12:46Z","true","false"],
  ["1324774931","VGE0303","Fase 3 -  Vistoria Inicial","2026-03-26T11:54:07Z","2026-04-01T13:12:26Z","true","false"],
  ["1313076071","SCR0316","Fase 3 -  Vistoria Inicial","2026-03-09T17:30:19Z","2026-04-01T13:12:11Z","true","false"],
  ["1251688390","RAM0002","Fase 3 -  Vistoria Inicial","2025-11-07T17:30:26Z","2026-04-01T13:11:54Z","true","false"],
  ["1251688449","RAM0003","Fase 3 -  Vistoria Inicial","2025-11-07T17:30:29Z","2026-04-01T13:11:43Z","true","false"],
  ["1325022908","CNS1903","Fase 3 -  Vistoria Inicial","2026-03-26T16:56:40Z","2026-04-01T13:11:22Z","true","false"],
  ["1305630808","BMC0508","Fase 3 -  Vistoria Inicial","2026-02-27T21:30:27Z","2026-04-01T13:10:40Z","true","false"],
  ["1313184294","SMA0206","Fase 3 -  Vistoria Inicial","2026-03-09T19:30:33Z","2026-04-01T13:10:27Z","true","false"],
  ["1295401594","GNB0177","Fase 3 -  Vistoria Inicial","2026-02-09T19:30:18Z","2026-04-01T13:09:55Z","true","false"],
  ["1297593877","GRLB1405","Fase 3 -  Vistoria Inicial","2026-02-13T17:30:30Z","2026-04-01T13:09:37Z","true","false"],
  ["1328057855","SKL0907","Fase 3 -  Vistoria Inicial","2026-03-31T20:06:52Z","2026-04-01T13:09:21Z","false","false"],
  ["1328057917","TDP1001","Fase 3 -  Vistoria Inicial","2026-03-31T20:06:55Z","2026-04-01T13:09:04Z","false","false"],
  ["1328057963","NWT1017","Fase 3 -  Vistoria Inicial","2026-03-31T20:06:58Z","2026-04-01T13:08:43Z","false","false"],
  ["1313236275","RVE0002","Fase 3 -  Vistoria Inicial","2026-03-09T20:30:25Z","2026-04-01T13:08:25Z","true","false"],
  ["1309135370","FDM0101","Fase 3 -  Vistoria Inicial","2026-03-04T13:30:21Z","2026-04-01T13:08:08Z","true","false"],
  ["1109715993","GUY0703","Fase 3 -  Vistoria Inicial","2025-03-31T22:30:21Z","2026-04-01T13:07:46Z","true","false"],
  ["1139794236","CAP0255","Fase 3 -  Vistoria Inicial","2025-05-12T13:30:17Z","2026-04-01T13:07:24Z","true","false"],
  ["1251688551","RAM0004","Fase 3 -  Vistoria Inicial","2025-11-07T17:30:37Z","2026-04-01T13:07:08Z","true","false"],
  ["1272522008","RZA0020","Fase 3 -  Vistoria Inicial","2025-12-24T14:30:19Z","2026-04-01T13:06:53Z","true","false"],
  ["1285056702","CDW0102","Fase 3 -  Vistoria Inicial","2026-01-21T14:30:26Z","2026-04-01T13:06:40Z","true","false"],
  ["1290305244","RAD0501","Fase 3 -  Vistoria Inicial","2026-01-29T14:30:21Z","2026-04-01T13:06:25Z","true","false"],
  ["1290305342","RAD0402","Fase 3 -  Vistoria Inicial","2026-01-29T14:30:24Z","2026-04-01T13:06:16Z","true","false"],
  ["1304589523","BVR0102","Fase 3 -  Vistoria Inicial","2026-02-26T14:30:29Z","2026-04-01T13:06:03Z","true","false"],
  ["1308162418","FLA0701","Fase 3 -  Vistoria Inicial","2026-03-03T14:30:27Z","2026-04-01T13:05:42Z","true","false"],
  ["1318087539","DIL1005","Fase 3 -  Vistoria Inicial","2026-03-16T12:30:13Z","2026-04-01T13:05:18Z","true","false"],
  ["1318992476","PKD0102","Fase 3 -  Vistoria Inicial","2026-03-17T13:30:16Z","2026-04-01T13:04:28Z","true","false"],
  ["1319922782","VIA0302","Fase 3 -  Vistoria Inicial","2026-03-18T17:30:23Z","2026-04-01T13:04:14Z","true","false"],
  ["1326962101","RCN0000","Fase 5 - Adequação/ Enxoval","2026-03-30T12:30:12Z","2026-04-01T13:03:46Z","false","false"],
  ["1319922822","LON0397","Fase 3 -  Vistoria Inicial","2026-03-18T17:30:26Z","2026-04-01T13:03:43Z","true","false"],
  ["1320385315","SPH0005","Fase 3 -  Vistoria Inicial","2026-03-19T12:30:27Z","2026-04-01T13:01:57Z","true","false"],
  ["1324774324","DIL0103","Fase 3 -  Vistoria Inicial","2026-03-26T11:53:26Z","2026-04-01T13:01:42Z","true","false"],
  ["1324774439","ZBA1202","Fase 3 -  Vistoria Inicial","2026-03-26T11:53:37Z","2026-04-01T13:01:27Z","true","false"],
  ["1325780519","VOAO0000","Fase 3 -  Vistoria Inicial","2026-03-27T16:32:30Z","2026-04-01T13:01:12Z","true","false"],
  ["1325997251","VAO1029","Fase 3 -  Vistoria Inicial","2026-03-27T21:30:09Z","2026-04-01T12:58:45Z","true","false"],
  ["1325997285","MUT0000","Fase 3 -  Vistoria Inicial","2026-03-27T21:30:12Z","2026-04-01T12:58:24Z","true","false"],
  ["1326017055","CDA1647","Fase 3 -  Vistoria Inicial","2026-03-27T22:10:49Z","2026-04-01T12:54:15Z","true","false"],
  ["1327016161","BZS0204","Fase 3 -  Vistoria Inicial","2026-03-30T13:30:20Z","2026-04-01T12:54:01Z","true","false"],
  ["1327252505","ENT0102","Fase 3 -  Vistoria Inicial","2026-03-30T18:30:14Z","2026-04-01T12:53:05Z","true","false"],
  ["1327301843","MOA0102","Fase 3 -  Vistoria Inicial","2026-03-30T19:30:13Z","2026-04-01T12:52:48Z","true","false"],
  ["1312743854","IDE0765","Fase 3 -  Vistoria Inicial","2026-03-09T12:30:19Z","2026-04-01T12:52:22Z","true","false"],
  ["1327153537","HAL10204","Fase 5 - Adequação/ Enxoval","2026-03-30T16:30:13Z","2026-04-01T12:50:53Z","false","false"],
  ["1324774598","CNCD0202","Fase 5 - Adequação/ Enxoval","2026-03-26T11:53:47Z","2026-04-01T12:29:51Z","false","false"],
  ["1261148554","JDN0410","Fase 5 - Adequação/ Enxoval","2025-11-28T21:30:20Z","2026-04-01T12:24:01Z","false","false"],
  ["1295720978","CRP0050","Fase 5 - Adequação/ Enxoval","2026-02-10T13:30:25Z","2026-04-01T12:20:10Z","false","false"],
  ["1324774649","BPM0102","Fase 5 - Adequação/ Enxoval","2026-03-26T11:53:50Z","2026-04-01T12:19:48Z","false","false"],
  ["1324774739","BRT0000","Fase 5 - Adequação/ Enxoval","2026-03-26T11:53:55Z","2026-04-01T12:19:27Z","false","false"],
  ["1318498916","VDP0000","Fase 5 - Adequação/ Enxoval","2026-03-16T18:30:28Z","2026-04-01T12:18:31Z","false","false"],
  ["1306937581","DSR0040","Fase 5 - Adequação/ Enxoval","2026-03-02T11:30:16Z","2026-04-01T12:18:09Z","false","false"],
  ["1290540846","IAZ0402","Fase 5 - Adequação/ Enxoval","2026-01-29T18:30:30Z","2026-04-01T12:17:45Z","false","false"],
  ["1313236318","API0062","Fase 5 - Adequação/ Enxoval","2026-03-09T20:30:28Z","2026-04-01T12:17:22Z","false","false"],
  ["1306937551","MAI0501","Fase 5 - Adequação/ Enxoval","2026-03-02T11:30:14Z","2026-04-01T12:17:01Z","false","false"],
  ["1325132127","SLI1013","Fase 5 - Adequação/ Enxoval","2026-03-26T18:53:23Z","2026-04-01T12:16:32Z","false","false"],
  ["1279624582","SRB0101","Fase 5 - Adequação/ Enxoval","2026-01-09T19:30:30Z","2026-04-01T12:16:06Z","false","false"],
  ["1314829986","HVE0201","Fase 5 - Adequação/ Enxoval","2026-03-11T19:30:16Z","2026-04-01T12:15:41Z","false","false"],
  ["1282996545","JCI0126","Fase 5 - Adequação/ Enxoval","2026-01-16T19:30:30Z","2026-04-01T12:15:16Z","false","false"],
  ["1325132078","TPV1113","Fase 5 - Adequação/ Enxoval","2026-03-26T18:53:20Z","2026-04-01T12:14:50Z","false","false"],
  ["1310861847","FTM0106","Fase 5 - Adequação/ Enxoval","2026-03-06T19:30:20Z","2026-04-01T12:14:28Z","false","false"],
  ["1313845259","RCQ0205","Fase 5 - Adequação/ Enxoval","2026-03-10T16:30:26Z","2026-04-01T12:13:55Z","false","false"],
  ["1295401665","ACU0044","Fase 5 - Adequação/ Enxoval","2026-02-09T19:30:24Z","2026-04-01T12:13:34Z","false","false"],
  ["1313236223","RVE0001","Fase 5 - Adequação/ Enxoval","2026-03-09T20:30:22Z","2026-04-01T12:13:11Z","false","false"],
  ["1314033076","CLI0018","Fase 5 - Adequação/ Enxoval","2026-03-10T20:31:02Z","2026-04-01T12:12:44Z","false","false"],
  ["1309233085","ELI0204","Fase 5 - Adequação/ Enxoval","2026-03-04T17:30:40Z","2026-04-01T12:12:05Z","false","false"],
  ["1204280134","MVB0404","Fase 5 - Adequação/ Enxoval","2025-08-29T11:30:24Z","2026-04-01T12:11:45Z","false","false"],
  ["1254371229","HSA1005","Fase 5 - Adequação/ Enxoval","2025-11-13T13:30:28Z","2026-04-01T12:11:15Z","false","false"],
  ["1261110708","ENO0110","Fase 5 - Adequação/ Enxoval","2025-11-28T20:30:34Z","2026-04-01T12:10:51Z","false","false"],
  ["1292528829","RVA0050","Fase 5 - Adequação/ Enxoval","2026-02-03T15:30:26Z","2026-04-01T12:09:02Z","false","false"],
  ["1304194565","ORI1001","Fase 5 - Adequação/ Enxoval","2026-02-25T20:30:28Z","2026-04-01T12:08:33Z","false","false"],
  ["1309156571","LDI0008","Fase 5 - Adequação/ Enxoval","2026-03-04T15:30:24Z","2026-04-01T12:07:21Z","false","false"],
  ["1310598846","SIP0206","Fase 5 - Adequação/ Enxoval","2026-03-06T14:30:24Z","2026-04-01T12:06:52Z","false","false"],
  ["1313684596","SKL0504","Fase 5 - Adequação/ Enxoval","2026-03-10T12:30:22Z","2026-04-01T12:05:56Z","false","false"],
  ["1313729218","MCT0090","Fase 5 - Adequação/ Enxoval","2026-03-10T13:30:27Z","2026-04-01T12:05:29Z","false","false"],
  ["1314427099","SSS0709","Fase 5 - Adequação/ Enxoval","2026-03-11T12:30:18Z","2026-04-01T12:05:02Z","false","false"],
  ["1318087615","LMR0902","Fase 5 - Adequação/ Enxoval","2026-03-16T12:30:16Z","2026-04-01T12:04:32Z","false","false"],
  ["1318234175","CUMD0002","Fase 5 - Adequação/ Enxoval","2026-03-16T14:30:25Z","2026-04-01T12:04:07Z","false","false"],
  ["1318619440","ODZ0102","Fase 5 - Adequação/ Enxoval","2026-03-16T20:30:20Z","2026-04-01T12:03:22Z","false","false"],
  ["1318939872","VDK0402","Fase 5 - Adequação/ Enxoval","2026-03-17T12:30:14Z","2026-04-01T12:03:00Z","false","false"],
  ["1319264793","SDB0206","Fase 5 - Adequação/ Enxoval","2026-03-17T18:30:18Z","2026-04-01T12:02:32Z","false","false"],
  ["1319352325","ODP0037","Fase 5 - Adequação/ Enxoval","2026-03-17T20:30:21Z","2026-04-01T12:01:56Z","false","false"],
  ["1319922729","SEY0302","Fase 5 - Adequação/ Enxoval","2026-03-18T17:30:19Z","2026-04-01T12:01:36Z","false","false"],
  ["1324774290","OON0607","Fase 5 - Adequação/ Enxoval","2026-03-26T11:53:23Z","2026-04-01T11:59:16Z","false","false"],
  ["1325237327","PRU0000","Fase 5 - Adequação/ Enxoval","2026-03-26T20:53:11Z","2026-04-01T11:58:43Z","false","false"],
  ["1325278107","VIO0312","Fase 5 - Adequação/ Enxoval","2026-03-26T21:53:19Z","2026-04-01T11:58:22Z","false","false"],
  ["1297126754","GAR0299","Fase 5 - Adequação/ Enxoval","2026-02-12T20:30:22Z","2026-04-01T11:57:30Z","false","false"],
  ["1226335390","JDN0213","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-10-02T22:30:21Z","2026-04-01T01:18:42Z","false","false"],
  ["1305630851","ING0023","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-27T21:30:30Z","2026-04-01T01:17:46Z","false","false"],
  ["1256951214","MAP1408","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-11-19T15:30:27Z","2026-04-01T00:47:42Z","false","false"],
  ["1320062114","GUS0050","Fase 5 - Adequação/ Enxoval","2026-03-18T20:30:20Z","2026-03-31T21:36:56Z","false","false"],
  ["1304589559","PAM0607","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-26T14:30:32Z","2026-03-31T21:27:29Z","false","false"],
  ["1313236361","PON0302","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-09T20:30:31Z","2026-03-31T20:59:45Z","false","false"],
  ["1320385201","RPI0110","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-19T12:30:17Z","2026-03-31T20:52:41Z","false","false"],
  ["1325278078","VIO1810","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-26T21:53:17Z","2026-03-31T20:43:30Z","false","false"],
  ["1325278150","VIO1409","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-26T21:53:22Z","2026-03-31T20:38:57Z","false","false"],
  ["1282774750","AEM0004","Fase 9 - Fotografia","2026-01-16T13:03:39Z","2026-03-31T20:35:26Z","false","false"],
  ["1315651548","THO2907","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-03-12T13:30:22Z","2026-03-31T20:20:34Z","false","false"],
  ["1302966600","MAA0002","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-24T16:30:43Z","2026-03-31T19:49:46Z","false","false"],
  ["1320469983","GET0805","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-19T14:30:25Z","2026-03-31T19:39:30Z","false","false"],
  ["1288815392","JDN0911","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-01-27T16:35:48Z","2026-03-31T19:26:39Z","false","false"],
  ["1319117918","UPP0104","Fase 8 - Ativação de Anúncio","2026-03-17T15:30:17Z","2026-03-31T18:45:17Z","false","false"],
  ["1306937617","BRS2170","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-02T11:30:19Z","2026-03-31T18:44:11Z","false","false"],
  ["1310861893","NSZ0194","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-06T19:30:23Z","2026-03-31T18:42:45Z","false","false"],
  ["1300118184","JNE0343","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-20T12:30:16Z","2026-03-31T18:39:12Z","false","false"],
  ["1320017211","VST029","Fase 9 - Fotografia","2026-03-18T19:30:17Z","2026-03-31T18:32:27Z","false","false"],
  ["1239680943","BLI2903","Fase 9 - Fotografia","2025-10-20T13:30:17Z","2026-03-31T18:32:13Z","false","false"],
  ["1272209823","GRLA1802","Fase 9 - Fotografia","2025-12-23T20:30:34Z","2026-03-31T18:31:27Z","false","false"],
  ["1272115735","SBH0237","Fase 9 - Fotografia","2025-12-23T18:30:25Z","2026-03-31T18:31:15Z","false","false"],
  ["1249479381","SVM1310","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-11-04T13:30:32Z","2026-03-31T18:27:21Z","false","false"],
  ["1264419617","NIU0081","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-12-05T00:30:16Z","2026-03-31T18:26:58Z","false","false"],
  ["1240121035","CDD0077","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-10-20T21:30:19Z","2026-03-31T18:26:38Z","false","false"],
  ["1109716030","NOS0201","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-03-31T22:30:24Z","2026-03-31T18:26:02Z","false","false"],
  ["1180103144","JDN0216","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-07-21T14:30:21Z","2026-03-31T18:25:12Z","false","false"],
  ["1248083400","CDI0042","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-10-31T15:30:21Z","2026-03-31T18:24:51Z","false","false"],
  ["1255633839","SAA0118","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-11-17T13:30:20Z","2026-03-31T18:24:26Z","false","false"],
  ["1290185604","SCZ0503","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-01-29T12:30:25Z","2026-03-31T18:23:53Z","false","false"],
  ["1310598819","VBX10618","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-06T14:30:21Z","2026-03-31T18:13:11Z","false","false"],
  ["1281834222","MPE0901","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-01-14T17:30:27Z","2026-03-31T18:12:41Z","false","false"],
  ["1285002671","LPK0302","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-01-21T13:30:23Z","2026-03-31T18:07:39Z","false","false"],
  ["1292219993","PBS0087","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-02T22:30:29Z","2026-03-31T18:06:52Z","false","false"],
  ["1243635477","CAI0211","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-10-24T22:30:22Z","2026-03-31T18:02:21Z","false","false"],
  ["1304551525","ILG0307","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-26T13:30:26Z","2026-03-31T18:01:38Z","false","false"],
  ["1320597928","PIU0105","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-19T17:33:20Z","2026-03-31T17:58:05Z","false","false"],
  ["1251688567","RAM0001","Fase 7 - Revisão/Limpeza/Fotos amadoras","2025-11-07T17:30:39Z","2026-03-31T17:51:20Z","false","false"],
  ["1320469951","ILP0801","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-19T14:30:21Z","2026-03-31T17:50:03Z","false","false"],
  ["1309991345","DGA0204","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-05T18:30:15Z","2026-03-31T17:45:24Z","false","false"],
  ["1288904066","SAK0819","Fase 10 - Pendências + Registro vistoria no SAPRON","2026-01-27T18:30:27Z","2026-03-31T17:03:32Z","false","false"],
  ["1309085426","SAN0006","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-04T12:30:18Z","2026-03-31T15:54:50Z","false","false"],
  ["1325071236","FDS0303","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-26T17:53:09Z","2026-03-31T15:50:19Z","false","false"],
  ["1305301662","IRAI0307","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-02-27T14:30:32Z","2026-03-31T15:43:03Z","false","false"],
  ["1313976721","VLP0106","Fase 7 - Revisão/Limpeza/Fotos amadoras","2026-03-10T19:30:37Z","2026-03-31T15:41:05Z","false","false"],
  ["1290587346","GAV0201","Fase 2 - Setup Interno","2026-01-29T19:30:24Z","2026-03-31T13:43:42Z","false","false"],
  ["1234200415","SKL1505","Fase 2 - Setup Interno","2025-10-13T14:30:30Z","2026-03-31T13:40:30Z","false","false"],
  ["1286085591","TDU1604","Fase 2 - Setup Interno","2026-01-22T21:30:25Z","2026-03-31T13:37:56Z","false","false"],
  ["1291041939","TCO0410","Fase 2 - Setup Interno","2026-01-30T17:30:33Z","2026-03-31T13:36:31Z","false","false"],
  ["1297162703","PIN1910","Fase 5 - Adequação/ Enxoval","2026-02-12T21:30:32Z","2026-03-31T12:54:42Z","false","false"],
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to Neon");

  // Clear existing data
  await client.query("DELETE FROM stages");
  await client.query("DELETE FROM properties");
  console.log("Cleared existing data");

  let propCount = 0;
  let stageCount = 0;

  for (const [_id, title, phase_name, created_at, updated_at, late, _overdue] of NEKT_DATA) {
    const phaseConfig = PHASE_MAP[phase_name] ?? { number: 1, status: "in_progress" };
    const sla_color = late === "true" ? "red" : "green";

    // Insert property
    const propRes = await client.query(
      `INSERT INTO properties (codigo_imovel, endereco, cidade, uf, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (codigo_imovel) DO UPDATE SET updated_at = EXCLUDED.updated_at
       RETURNING id`,
      [title, "N/A", "SC", "SC", "ativo", new Date(created_at), new Date(updated_at)]
    );
    const property_id = propRes.rows[0].id;
    propCount++;

    // Insert stage
    await client.query(
      `INSERT INTO stages (property_id, stage_number, stage_name, status, sla_color, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [property_id, phaseConfig.number, phase_name, phaseConfig.status, sla_color, new Date(created_at)]
    );
    stageCount++;
  }

  await client.end();
  console.log(`Done: ${propCount} properties, ${stageCount} stages inserted`);
}

main().catch((e) => { console.error(e); process.exit(1); });
