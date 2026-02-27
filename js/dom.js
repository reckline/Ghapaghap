function showContent(type) {
  // Hide all sections first
  document.getElementById("content-shorts").classList.add("hidden");
  document.getElementById("content-videos").classList.add("hidden");

  // Show the selected one
  const targetId = "content-" + type;
  document.getElementById(targetId).classList.remove("hidden");
}
