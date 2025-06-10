// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdxcEzQNH53JLsjI2uo-oApXFLZ5NzxGE",
  authDomain: "sc-deburring-job-view-2d546.firebaseapp.com",
  databaseURL: "https://sc-deburring-job-view-2d546-default-rtdb.firebaseio.com",
  projectId: "sc-deburring-job-view-2d546",
  storageBucket: "sc-deburring-job-view-2d546.firebasestorage.app",
  messagingSenderId: "364676812827",
  appId: "1:364676812827:web:6b0c694a050e6bac0228be"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const JOBS_PER_SLIDE = 4;
const SLIDE_DURATION = 12000; // 12s
let currentSlide = 0;
let totalSlides  = 0;
let slideInterval, progressInterval;

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDaysUntilDue(dueDateString) {
  if (!dueDateString) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDateString); due.setHours(0,0,0,0);
  return Math.ceil((due - today) / (1000*60*60*24));
}

function getDateClass(dueDateString) {
  const days = getDaysUntilDue(dueDateString);
  if (days === null)       return "date-due";
  if (days < 0 || days <= 2) return "date-overdue";
  return "date-due";
}

function getDueDateText(dueDateString) {
  const days = getDaysUntilDue(dueDateString);
  if (days === null) return formatDate(dueDateString);
  if (days < 0)      return `${Math.abs(days)}d overdue`;
  if (days === 0)    return "Due today";
  if (days === 1)    return "Due tomorrow";
  if (days <= 7)     return `${days} days`;
  return formatDate(dueDateString);
}

function createJobCard(job) {
  const cls       = job.hotOrder ? "hot-order" : "";
  const dateClass = getDateClass(job.dueDate);
  const dueText   = getDueDateText(job.dueDate);

  return `
    <div class="job-card ${cls}">
      <div class="job-header">
        <div class="po-number">${job.poNumber||"No PO"}</div>
      </div>
      <div class="job-details">
        <div class="detail-item">
          <div class="detail-label">Job #</div>
          <div class="detail-value">${job.jobNumber||job.id}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Part</div>
          <div class="detail-value">${job.partNumber||"-"}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Qty</div>
          <div class="detail-value">${job.quantity||"-"}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Priority</div>
          <div class="detail-value">${job.hotOrder?"🔥 HIGH":"Normal"}</div>
        </div>
      </div>
      <div class="dates-section">
        <div class="date-item">
          <div class="date-label">Received</div>
          <div class="date-value date-received">${formatDate(job.receivedDate)}</div>
        </div>
        <div class="date-item">
          <div class="date-label">Due</div>
          <div class="date-value ${dateClass}">${dueText}</div>
        </div>
      </div>
    </div>`;
}

function createListView(jobs) {
  return `
    <div class="list-view">
      <h2>All Active Jobs</h2>
      <div class="job-list">
        ${jobs.map(job => {
          const cls       = job.hotOrder ? "hot-order" : "";
          const dateClass = getDateClass(job.dueDate);
          const dueText   = getDueDateText(job.dueDate);
          return `
            <div class="job-row ${cls}">
              <div class="job-row-item">
                <div class="job-row-label">PO Number</div>
                <div class="job-row-value">${job.poNumber||"No PO"}</div>
              </div>
              <div class="job-row-item">
                <div class="job-row-label">Job #</div>
                <div class="job-row-value">${job.jobNumber||job.id}</div>
              </div>
              <div class="job-row-item">
                <div class="job-row-label">Part</div>
                <div class="job-row-value">${job.partNumber||"-"}</div>
              </div>
              <div class="job-row-item">
                <div class="job-row-label">Qty</div>
                <div class="job-row-value">${job.quantity||"-"}</div>
              </div>
              <div class="job-row-item">
                <div class="job-row-label">Due Date</div>
                <div class="job-row-value ${dateClass}">${dueText}</div>
              </div>
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

function createSlides(jobs) {
  const slides = [];
  for (let i = 0; i < jobs.length; i += JOBS_PER_SLIDE) {
    slides.push(`
      <div class="slide">
        <div class="jobs-grid">
          ${jobs.slice(i, i + JOBS_PER_SLIDE).map(createJobCard).join("")}
        </div>
      </div>`);
  }
  const half = Math.ceil(jobs.length / 2);
  slides.push(`<div class="slide">${createListView(jobs.slice(0, half))}</div>`);
  if (jobs.length > half)
    slides.push(`<div class="slide">${createListView(jobs.slice(half))}</div>`);
  return slides;
}

function updateSlideIndicators() {
  document.getElementById("current-slide").textContent = currentSlide + 1;
  document.getElementById("total-slides").textContent  = totalSlides;
}

function showSlide(idx) {
  document.querySelectorAll(".slide").forEach((s,i)=>
    s.classList.toggle("active", i === idx)
  );
  updateSlideIndicators();
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % totalSlides;
  showSlide(currentSlide);
}

function startSlideshow() {
  clearInterval(slideInterval);
  clearInterval(progressInterval);
  if (totalSlides <= 1) return;
  let prog = 0;
  const bar = document.getElementById("progress-bar");
  progressInterval = setInterval(() => {
    prog += 100 / (SLIDE_DURATION / 100);
    bar.style.width = prog + "%";
    if (prog >= 100) prog = 0;
  }, 100);
  slideInterval = setInterval(nextSlide, SLIDE_DURATION);
}

function renderSlideshow(jobs) {
  const container = document.getElementById("slides-container");
  const totalEl   = document.getElementById("total-jobs");
  const hotEl     = document.getElementById("hot-orders");
  const updEl     = document.getElementById("last-updated");
  if (!jobs.length) {
    container.innerHTML = `<div class="loading">No active jobs found</div>`;
    totalEl.textContent = "0";
    hotEl.textContent   = "0";
    totalSlides         = 0;
    return;
  }
  jobs.sort((a,b)=>{
    const da = a.dueDate ? new Date(a.dueDate) : new Date("9999-12-31");
    const db = b.dueDate ? new Date(b.dueDate) : new Date("9999-12-31");
    return da - db;
  });
  totalEl.textContent   = jobs.length;
  hotEl.textContent     = jobs.filter(j => j.hotOrder).length;
  updEl.textContent     = new Date().toLocaleTimeString();
  const slides = createSlides(jobs);
  totalSlides = slides.length;
  container.innerHTML = slides.join("");
  currentSlide = 0;
  showSlide(0);
  startSlideshow();
}

function handleError(err) {
  console.error(err);
  document.getElementById("slides-container").innerHTML =
    `<div class="error">Error loading jobs. Check connection.</div>`;
}

function loadJobs() {
  const col = collection(db, "jobs");
  const q   = query(col, where("active","==",true));
  onSnapshot(q, snap => {
    const arr = [];
    snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    renderSlideshow(arr);
  }, handleError);
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === " ") nextSlide();
    else if (e.key === "ArrowLeft") {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      showSlide(currentSlide);
    }
  });
  loadJobs();
  setInterval(() => {
    document.getElementById("last-updated").textContent =
      new Date().toLocaleTimeString();
  }, 30000);
});
