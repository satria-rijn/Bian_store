document.addEventListener("DOMContentLoaded", () => {
  /* ==================== Cached DOM ==================== */
  const homePage = document.getElementById("home-page");
  const paymentPage = document.getElementById("payment-page");
  const adminPage = document.getElementById("admin-page");
  const loginPage = document.getElementById("login-page");
  const productForm = document.getElementById("product-form");
  const priceInput = document.getElementById("product-price");
  const productList = document.getElementById("product-list");
  const menuLinks = document.querySelectorAll(".menu a");
  const hamburger = document.querySelector(".hamburger");
  const menu = document.querySelector(".menu");
  const copyButtons = document.querySelectorAll(".copy-btn");

  let isLoggedIn = false;

  /* ==================== Helper ==================== */
  const apiFetch = (url, options = {}) =>
    fetch(url, { credentials: "include", ...options });

  /* ==================== Format harga ==================== */
  priceInput.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    e.target.value = digits ? Number(digits).toLocaleString("id-ID") : "";
  });

  /* ==================== Navbar & Hamburger ==================== */
  hamburger.addEventListener("click", () => {
    menu.classList.toggle("active");
    hamburger.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
      menu.classList.remove("active");
      hamburger.classList.remove("active");
    }
  });

  /* ==================== Navigasi Halaman ==================== */
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = e.target.id;

      // Sembunyikan semua halaman
      [homePage, paymentPage, adminPage, loginPage].forEach((page) => {
        page.classList.remove("active");
        page.style.display = "none";
      });

      // Tampilkan sesuai target
      if (target === "home-link") {
        homePage.style.display = "block";
        homePage.classList.add("active");
      } else if (target === "payment-link") {
        paymentPage.style.display = "block";
        paymentPage.classList.add("active");
      } else if (target === "login-link") {
        loginPage.style.display = "block";
        loginPage.classList.add("active");
      } else if (target === "admin-link") {
        if (isLoggedIn) {
          adminPage.style.display = "block";
          adminPage.classList.add("active");
        } else {
          loginPage.style.display = "block";
          loginPage.classList.add("active");
        }
      }
    });
  });

  /* ==================== Copy nomor rekening ==================== */
  copyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const number = btn.dataset.number;
      navigator.clipboard.writeText(number).then(() => {
        alert(`Nomor ${number} telah disalin!`);
      });
    });
  });

  /* ==================== Login Admin ==================== */
  document
    .getElementById("admin-login-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("admin-username").value.trim();
      const password = document.getElementById("admin-password").value.trim();
      const token = document.getElementById("admin-token").value.trim();

      apiFetch("/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, token }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Login gagal");
          return res.json();
        })
        .then(() => {
          alert("Login berhasil");
          isLoggedIn = true;
          loginPage.style.display = "none";
          adminPage.style.display = "block";
          adminPage.classList.add("active");
          renderProducts();
        })
        .catch((err) => {
          document.getElementById(
            "login-error"
          ).textContent = `Login gagal: ${err.message}`;
        });
    });

  /* ==================== Render Produk ==================== */
  const renderProducts = () => {
    productList.innerHTML = "Loading...";

    apiFetch("/products")
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat produk");
        return r.json();
      })
      .then((products) => {
        productList.innerHTML = products.length
          ? ""
          : "<p>Belum ada produk.</p>";
        products.forEach((p) => {
          const div = document.createElement("div");
          div.className = "product-item";
          div.innerHTML = `
            <h3>${p.name}</h3>
            <p>Owner   : ${p.owner}</p>
            <p>Version : ${p.version}</p>
            <p>Price   : Rp. ${Number(p.price).toLocaleString("id-ID")}</p>
            ${
              isLoggedIn
                ? `<button data-name="${p.name}" class="btn-hapus">Hapus</button>`
                : ""
            }
          `;
          productList.appendChild(div);
        });
      })
      .catch((err) => {
        productList.innerHTML = `<p style='color:red'>${err.message}</p>`;
      });
  };

  /* ==================== Delete Produk (delegasi event) ==================== */
  productList.addEventListener("click", (e) => {
    if (!e.target.matches(".btn-hapus")) return;
    if (!isLoggedIn) return alert("Akses ditolak");

    const name = e.target.dataset.name;
    if (!confirm(`Hapus produk ${name}?`)) return;

    apiFetch(`/products/by-name/${encodeURIComponent(name)}`, {
      method: "DELETE",
    })
      .then((r) => r.json())
      .then((d) => {
        alert(d.message);
        renderProducts();
      })
      .catch((err) => alert("Gagal hapus: " + err.message));
  });

  /* ==================== Tambah Produk ==================== */
  productForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isLoggedIn) return alert("Anda belum login sebagai admin");

    const rawPrice = priceInput.value.replace(/\D/g, "");
    if (!rawPrice) return alert("Harga tidak valid");

    const newProduct = {
      name: document.getElementById("product-name").value.trim(),
      owner: document.getElementById("product-author").value.trim(),
      version: document.getElementById("product-version").value.trim(),
      price: Number(rawPrice),
    };

    apiFetch("/add-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal menambahkan produk");
        return r.json();
      })
      .then((d) => {
        alert(d.message);
        productForm.reset();
        priceInput.value = "";
        renderProducts();
      })
      .catch((err) => alert(err.message));
  });

  /* ==================== First Load ==================== */
  renderProducts();
});
