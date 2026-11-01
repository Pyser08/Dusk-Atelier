// 기억 탭 첫 진입 때 임베딩(의미 검색)을 한 번만 소개한다.
import { runTour } from "../../tour.js";
import { openEmbedModal } from "./embedmodal.js";

const KEY = "rbm:memoryEmbeddingGuide:shown:v1";
let shownThisSession = false;

export async function maybeShowEmbeddingGuide(ctx) {
  if (shownThisSession) return;
  shownThisSession = true;
  let seen = false;
  try { seen = !!(await ctx.api.pluginStorage.getItem(KEY)); } catch {}
  if (seen) return;
  try { await ctx.api.pluginStorage.setItem(KEY, "1"); } catch {}
  // 임베딩 줄을 하이라이트하며 소개한다(처음 둘러보기와 같은 방식). 줄이 아직 안 그려졌으면 가운데에 뜬다.
  const open = () => openEmbedModal(ctx).catch(() => {});
  await runTour(ctx, [{ icon: "search", title: "임베딩으로 기억을 더 잘 찾아요",
    text: "임베딩은 단어가 달라도 뜻이 비슷한 기억을 찾아 주는 기능이에요. 예를 들어 ‘검은 열쇠’를 ‘낡은 자물쇠 열쇠’라고 표현해도 관련 기억을 찾아요.\n기본은 꺼져 있어요. 쓰려면 API 주소·모델·키를 넣고 ‘기본으로 사용’을 켜 주세요. 느리거나 실패하면 원래 방식으로 넘어가요.",
    target: ['[data-tour="mem-embed"]'], action: { label: "임베딩 설정", onClick: open } }], { label: "임베딩 안내", doneLabel: "나중에" });
}
