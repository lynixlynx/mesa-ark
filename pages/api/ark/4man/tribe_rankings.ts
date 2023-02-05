import { Prisma, PrismaClient } from '@prisma/client'
import { NextApiRequest, NextApiResponse } from 'next';


const prisma = new PrismaClient()

type Data = {
  pagination: any,
  ranking_data: any
}

type CurrentPage = string;
type Search = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {

  //const search = req.query.search ? req.query.search : ""
  const filter = req.query.filter ? req.query.filter : ""

  let search = req.query.search ? "%" + req.query.search + "%" : "%%";
  

  let safeFilter = "mesadb.advancedachievements_tribedata.DamageScore"
  switch(filter) {
    case "Time Played":
      safeFilter = "PlayTime"
      break;
  }

  const ranking_data =  await prisma.$queryRaw`
  SELECT 
  mesadb.advancedachievements_playerdata.TribeID, 
  mesadb.advancedachievements_tribedata.TribeName,
  mesadb.advancedachievements_tribedata.DamageScore,
  Count(SteamID) as Members, 
  Sum(PlayerKills) as Kills,
  Sum(DeathByPlayer) as Deaths,
  Sum(DinoKills) as DinoKills,
  Sum(PlayTime) as PlayTime
  FROM mesadb.advancedachievements_playerdata
  INNER JOIN mesadb.advancedachievements_tribedata
  ON mesadb.advancedachievements_playerdata.TribeID = mesadb.advancedachievements_tribedata.TribeID
  WHERE mesadb.advancedachievements_tribedata.TribeName LIKE ${search}
  GROUP BY mesadb.advancedachievements_playerdata.TribeID
  ORDER BY ${safeFilter} DESC
  LIMIT 15`;


  const safe_ranking_data = JSON.parse(JSON.stringify(ranking_data, (key, value) =>
  typeof value === 'bigint'
      ? value.toString()
      : value // return everything else unchanged
  ));

  const current_page = (req.query.page ? req.query.page : 0);
  const pages = await prisma.advancedachievements_tribedata.count({});
  var next_page = null;
  var prev_page = null;

  if(current_page < 69) {
    next_page = `https://mesa-ark.com/api/ark/tribe_rankings?page=${parseInt(current_page as CurrentPage) + 1}&search=${search}`;
  }

  if(current_page > 0) {
    prev_page = `https://mesa-ark.com/api/ark/tribe_rankings?page=${parseInt(current_page as CurrentPage) - 1}&search=${search}`;
  }

  /* Return All Required Data */
  res.status(200).send({
    pagination: {
      total_pages: Math.round(pages / 20),
      current_page: parseInt(current_page as CurrentPage),
      next: next_page,
      prev: prev_page
    },
    ranking_data: safe_ranking_data
  });
}
