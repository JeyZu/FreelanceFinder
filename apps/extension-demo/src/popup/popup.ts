import { getElements } from "./dom";
import { setupPopup } from "./actions";

async function bootstrap() {
  try {
    const elements = getElements();
    await setupPopup(elements);
  } catch (error) {
    console.error("popup_init_failed", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
