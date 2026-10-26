exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      statusCode: 503,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({error:"OPENAI_API_KEY가 Netlify 환경변수에 설정되어 있지 않습니다."})
    };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); }
  catch {
    return {statusCode:400,body:JSON.stringify({error:"잘못된 요청입니다."})};
  }

  const name = String(body.name || "").trim();
  const image = typeof body.image === "string" ? body.image : "";

  if (!name && !image) {
    return {statusCode:400,body:JSON.stringify({error:"차 이름이나 사진이 필요합니다."})};
  }

  // Keep uploads bounded so a phone photo cannot create an oversized request.
  if (image && image.length > 9_000_000) {
    return {statusCode:413,body:JSON.stringify({error:"사진이 너무 큽니다. 더 작은 사진을 사용해주세요."})};
  }

  const textPrompt = `
당신은 차(tea) 브루잉 전문 AI입니다.
사용자가 제공한 차 이름과 사진을 바탕으로 차의 정체를 가능한 범위에서 확인하고,
웹 검색으로 신뢰할 수 있는 최신/원문 자료를 확인한 뒤 한국어로 맛있게 우리는 법을 추천하세요.

사용자 입력:
- 차 이름: ${name || "(입력 없음)"}

반드시 지킬 규칙:
1. 사진만으로 차의 종류나 브랜드를 확정할 수 없으면 "사진만으로는 확정하기 어렵다"고 명확히 말하세요.
2. 검색 결과가 서로 다른 경우 하나를 임의로 확정하지 말고 차이를 설명하세요.
3. 물 온도, 찻잎 양, 물 양, 첫 우리기 시간, 재탕 방법을 구체적으로 제시하세요.
4. 가능하면 판매처/제조사/차 생산자/공식 제품 페이지 같은 1차 자료를 우선하고, 그 다음 전문 차 자료를 참고하세요.
5. 검색으로 확인된 내용과 일반적인 브루잉 권장값을 구분하세요.
6. 차의 종류가 확인되지 않으면 안전하게 "확인된 범위"만 제시하고 추측하지 마세요.
7. 답변은 다음 순서로 간결하게 작성하세요:
   차 확인 → 가장 추천하는 우리법 → 재탕 → 실패하기 쉬운 점 → 검색에서 확인한 근거
8. "검색에서 확인한 근거"에는 사이트 이름과 핵심적으로 확인된 내용을 짧게 적으세요.
9. 광고성 표현이나 과장된 효능 주장은 하지 마세요.
`;

  const content = [{type:"input_text", text:textPrompt}];
  if (image) {
    content.push({type:"input_image", image_url:image, detail:"high"});
  }

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${key}`
      },
      body:JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        tools:[{type:"web_search"}],
        input:[{role:"user",content}],
        max_output_tokens:900
      })
    });

    const data = await r.json();
    if(!r.ok) {
      return {
        statusCode:r.status,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({error:data.error?.message||"AI 요청에 실패했습니다."})
      };
    }

    const messageItems = (data.output || []).filter(x=>x.type==="message");
    const answer = messageItems
      .flatMap(x=>x.content || [])
      .filter(x=>x.type==="output_text")
      .map(x=>x.text)
      .join("\n")
      .trim();

    const annotations = messageItems
      .flatMap(x=>x.content || [])
      .flatMap(x=>x.annotations || [])
      .filter(x=>x.type==="url_citation" && x.url)
      .map(x=>({url:x.url,title:x.title || x.url}))
      .filter((x,i,a)=>a.findIndex(y=>y.url===x.url)===i)
      .slice(0,8);

    return {
      statusCode:200,
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        answer:answer || "검색 결과를 바탕으로 추천 결과를 만들지 못했습니다.",
        searched:true,
        sources:annotations
      })
    };
  } catch(e) {
    return {
      statusCode:500,
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({error:e.message || "서버 오류가 발생했습니다."})
    };
  }
};
