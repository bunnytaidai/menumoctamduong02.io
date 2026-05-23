document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. TÍNH TOÁN KÍCH THƯỚC ĐÁP ỨNG (RESPONSIVE)
    // ==========================================================================
    const bookEl = document.getElementById('book');
    const contentFrame = document.getElementById('frame-4');
    
    // Tỷ lệ khung hình của trang đơn ( flyers / book cover: ~ 3:4 tức là 0.73 )
    const ASPECT_RATIO = 0.73; 
    let pageWidth = 380;
    let pageHeight = 540;

    function calculateBookSize() {
        // Chiều cao book lấy khoảng 90% chiều cao của Frame 4 (60% height toàn trang)
        const frameHeight = contentFrame.clientHeight;
        pageHeight = Math.floor(frameHeight * 0.9);
        
        // Giới hạn chiều cao tối đa để sách cân đối
        if (pageHeight > 620) pageHeight = 620;
        if (pageHeight < 320) pageHeight = 320;

        // Tính chiều rộng trang đơn tương ứng
        pageWidth = Math.floor(pageHeight * ASPECT_RATIO);

        // ĐẢM BẢO KHÔNG TRÀN MÀN HÌNH DI ĐỘNG:
        // Căn lề hai bên cực mảnh (5px) giúp trang sách to tối đa trên di động
        const maxAllowedWidth = window.innerWidth - 10;
        if (pageWidth > maxAllowedWidth) {
            pageWidth = maxAllowedWidth;
            // Tính ngược lại chiều cao tương ứng theo tỷ lệ vàng để không méo hình
            pageHeight = Math.floor(pageWidth / ASPECT_RATIO);
        }

        // Đẩy giá trị vào biến CSS toàn cục để căn chỉnh viewport, gáy, nút nhấn...
        document.documentElement.style.setProperty('--page-width', `${pageWidth}px`);
        document.documentElement.style.setProperty('--page-height', `${pageHeight}px`);
    }

    // Chạy lần đầu tiên để lấy kích thước
    calculateBookSize();

    // ==========================================================================
    // 2. KHỞI TẠO DANH SÁCH TRANG NỘI DUNG (LOAD TỐC ĐỘ SIÊU TỐC - ZERO DELAY)
    // ==========================================================================
    let pageFlip = null;
    
    // Khai báo cứng danh sách ảnh thực tế để bỏ qua việc quét tuần tự qua mạng gây chậm trễ trang
    const imagesScanned = [
        'images/2.jpg',
        'images/3.jpg',
        'images/4.jpg',
        'images/5.jpg',
        'images/6.jpg'
    ];

    function loadPagesInstantly() {
        bookEl.innerHTML = ''; // Xóa loader lập tức
        const pageElements = [];

        // A. Trang 1: Trong suốt (Trang lót bên trái khi chưa mở bìa)
        const page1 = document.createElement('div');
        page1.className = 'page page-transparent';
        page1.setAttribute('data-density', 'hard');
        page1.innerHTML = `<div class="page-content"></div>`;
        pageElements.push(page1);

        // B. Trang 2: Trang bìa (dau.jpg) (nằm bên phải)
        const page2 = document.createElement('div');
        page2.className = 'page page-image';
        page2.setAttribute('data-density', 'hard');
        page2.innerHTML = `<div class="page-content" style="background-image: url('images/dau.jpg');"></div>`;
        pageElements.push(page2);

        // C. Các trang nội dung ở giữa
        imagesScanned.forEach(imgUrl => {
            // Trang trắng mặt sau (nằm bên trái)
            const pgWhite = document.createElement('div');
            pgWhite.className = 'page page-white';
            pgWhite.innerHTML = `<div class="page-content"></div>`;
            pageElements.push(pgWhite);

            // Trang nội dung (nằm bên phải)
            const pgContent = document.createElement('div');
            pgContent.className = 'page page-image';
            pgContent.innerHTML = `<div class="page-content" style="background-image: url('${imgUrl}');"></div>`;
            pageElements.push(pgContent);
        });

        // D. Trang trắng áp chót (nằm bên trái)
        const pageCuoiWhite = document.createElement('div');
        pageCuoiWhite.className = 'page page-white';
        pageCuoiWhite.innerHTML = `<div class="page-content"></div>`;
        pageElements.push(pageCuoiWhite);

        // E. Trang bìa cuối (cuoi.jpg) (nằm bên phải)
        const pageCuoi = document.createElement('div');
        pageCuoi.className = 'page page-image';
        pageCuoi.setAttribute('data-density', 'hard');
        pageCuoi.innerHTML = `<div class="page-content" style="background-image: url('images/cuoi.jpg');"></div>`;
        pageElements.push(pageCuoi);

        // Đưa các trang vào DOM
        pageElements.forEach(pg => bookEl.appendChild(pg));

        // Khởi tạo sách lật
        initPageFlip();
    }

    // ==========================================================================
    // 3. KHỞI TẠO THƯ VIỆN ST.PAGEFLIP
    // ==========================================================================
    function initPageFlip() {
        if (pageFlip) {
            pageFlip.destroy();
        }

        pageFlip = new St.PageFlip(bookEl, {
            width: pageWidth,
            height: pageHeight,
            size: "fixed",
            minWidth: pageWidth,
            maxWidth: pageWidth,
            minHeight: pageHeight,
            maxHeight: pageHeight,
            
            showCover: false,      // Sử dụng trang đôi liên tục.
            usePortrait: false,    // Ép hiển thị trang đôi kể cả trên mobile ngang.
            
            flippingTime: 300,     // Hoạt ảnh lật trang siêu tốc (300ms) cực kỳ nhạy và nhanh
            swipeDistance: 15,     // Giảm khoảng cách vuốt tối thiểu để lật trang nhanh hơn trên mobile
            maxShadowOpacity: 0.5, // Độ đậm của bóng bóng đổ StPageFlip vẽ
            showPageCorners: true, // Nhô mép trang khi di chuột qua để gợi ý lật
            disableKeyPress: true
        });

        // Nạp nội dung từ các div .page mới tạo trong HTML
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        // Cập nhật trạng thái ban đầu
        updateSpineAndUI();

        // Đăng ký các sự kiện lật trang
        pageFlip.on('flip', (e) => {
            updateSpineAndUI();
            hideSwipeHint();
        });

        pageFlip.on('changeState', (e) => {
            // Khi đang lật hoặc kéo, gáy sách hơi mờ đi để tạo cảm giác tự nhiên 3D
            const crease = document.getElementById('book-crease');
            if (e.data === 'page_flip' || e.data === 'user_fold') {
                crease.style.opacity = '0.5';
            } else {
                crease.style.opacity = '0.85';
            }
        });
    }

    // Khởi động nạp trang và sách lật siêu tốc ngay lập tức (không trễ)
    loadPagesInstantly();

    // ==========================================================================
    // 4. LOGIC XỬ LÝ GÁY SÁCH 3D & CHỈ MỤC & ĐIỀU HƯỚNG
    // ==========================================================================
    const pageIndicator = document.getElementById('page-indicator');

    const pageStack = document.getElementById('page-stack');
    const creaseOverlay = document.getElementById('book-crease');

    function updateSpineAndUI() {
        if (!pageFlip) return;

        const currentIdx = pageFlip.getCurrentPageIndex();
        const totalPages = pageFlip.getPageCount(); 
        const totalSpreads = Math.ceil(totalPages / 2); // Tổng số đôi trang
        const currentSpread = Math.floor(currentIdx / 2) + 1;

        // A. Cập nhật chỉ số trang dạng "X / Y"
        document.querySelector('.current-idx').textContent = currentSpread;
        document.querySelector('.total-pages').textContent = totalSpreads;



        // C. Logic gáy sách & Chồng viền giấy lề trái (30px - 50px)
        // Khi đang ở Trang bìa đầu tiên (đôi trang 1: index 0, 1):
        // Trang bên trái là trong suốt (index 0) nên chưa có trang nào lật sang bên trái.
        if (currentSpread === 1) {
            pageStack.style.opacity = '0'; // Ẩn chồng giấy bên trái
            
            // Dịch gáy sách lệch sang để chỉ tạo bóng đổ cho trang phải
            creaseOverlay.style.background = 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 48%, rgba(0,0,0,0.85) 49.5%, rgba(255,255,255,0.25) 50.5%, rgba(0,0,0,0.3) 53%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0) 100%)';
        } else {
            pageStack.style.opacity = '0.9'; // Hiện chồng giấy tượng trưng các trang đã lật qua
            
            // Trả về gáy 3D đối xứng 2 bên mềm mại
            creaseOverlay.style.background = 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.04) 20%, rgba(0, 0, 0, 0.2) 40%, rgba(0, 0, 0, 0.55) 46%, rgba(0, 0, 0, 0.85) 49%, rgba(0, 0, 0, 0.95) 50%, rgba(255, 255, 255, 0.25) 51%, rgba(0, 0, 0, 0.4) 54%, rgba(0, 0, 0, 0.15) 65%, rgba(0, 0, 0, 0.02) 80%, rgba(0, 0, 0, 0) 100%)';
        }
    }



    // ==========================================================================
    // 5. GỢI Ý CỬ CHỈ (SWIPE HINT)
    // ==========================================================================
    const swipeHint = document.getElementById('swipe-hint');
    let hintHidden = false;

    function hideSwipeHint() {
        if (hintHidden) return;
        swipeHint.style.transition = 'opacity 0.6s ease';
        swipeHint.style.opacity = '0';
        setTimeout(() => {
            swipeHint.style.display = 'none';
        }, 600);
        hintHidden = true;
    }

    // Tự động ẩn gợi ý sau 8 giây nếu người dùng không thao tác
    setTimeout(hideSwipeHint, 8000);

    // ==========================================================================
    // 6. RESPONSIVE WINDOW RESIZE
    // ==========================================================================
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            calculateBookSize();
            initPageFlip();
        }, 250); // Debounce resize sự kiện tránh giật lag
    });

});