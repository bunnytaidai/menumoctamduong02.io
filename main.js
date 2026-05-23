document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. KHAI BÁO CÁC PHẦN TỬ DOM & ĐỊNH CẤU HÌNH BAN ĐẦU
    // ==========================================================================
    const bookEl = document.getElementById('book');
    const contentFrame = document.getElementById('frame-4');
    const pageIndicator = document.getElementById('page-indicator');
    const pageStack = document.getElementById('page-stack');
    const creaseOverlay = document.getElementById('book-crease');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    // Tỷ lệ khung hình của trang đơn (flyers / book cover: ~ 3:4 tức là 0.73)
    const ASPECT_RATIO = 0.73; 
    let pageWidth = 380;
    let pageHeight = 540;
    let pageFlip = null;

    // ==========================================================================
    // 2. TÍNH TOÁN KÍCH THƯỚC ĐÁP ỨNG (RESPONSIVE)
    // ==========================================================================
    function calculateBookSize() {
        if (!contentFrame) return;
        
        // Chiều cao book lấy khoảng 98% chiều cao của Frame 4 để tối ưu hóa không gian hiển thị tối đa
        const frameHeight = contentFrame.clientHeight;
        pageHeight = Math.floor(frameHeight * 0.98);
        
        // Nới rộng giới hạn chiều cao tối đa lên 850px để sách hiển thị to rõ rực rỡ hơn trên Desktop lớn
        if (pageHeight > 850) pageHeight = 850;
        if (pageHeight < 320) pageHeight = 320;

        // Tính chiều rộng trang đơn tương ứng
        pageWidth = Math.floor(pageHeight * ASPECT_RATIO);

        // ĐẢM BẢO KHÔNG TRÀN MÀN HÌNH DI ĐỘNG:
        // Căn lề hai bên cực mảnh (5px), riêng trên di động chừa 90px để hiển thị trang lót trái và nút điều hướng phải
        const isMobile = window.innerWidth <= 600;
        const maxAllowedWidth = isMobile ? (window.innerWidth - 90) : (window.innerWidth - 10);
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
    // 3. LOGIC XỬ LÝ GÁY SÁCH 3D, CHỈ MỤC TRANG & TRẠNG THÁI NÚT ĐIỀU HƯỚNG
    // ==========================================================================
    function updateSpineAndUI(pageIndex) {
        if (!pageFlip) return;

        const currentIdx = (pageIndex !== undefined) ? pageIndex : pageFlip.getCurrentPageIndex();
        const totalPages = pageFlip.getPageCount(); 
        const totalSpreads = Math.ceil(totalPages / 2); // Tổng số đôi trang
        const currentSpread = Math.floor(currentIdx / 2) + 1;

        // A. Cập nhật chỉ số trang dạng "X / Y"
        const currentIdxEl = document.querySelector('.current-idx');
        const totalPagesEl = document.querySelector('.total-pages');
        if (currentIdxEl) currentIdxEl.textContent = currentSpread;
        if (totalPagesEl) totalPagesEl.textContent = totalSpreads;

        // B. Cập nhật trạng thái bật/tắt (disabled) của 2 nút điều hướng mũi tên
        if (btnPrev) {
            if (currentSpread === 1) {
                btnPrev.disabled = true;
                btnPrev.classList.add('disabled');
            } else {
                btnPrev.disabled = false;
                btnPrev.classList.remove('disabled');
            }
        }

        if (btnNext) {
            if (currentSpread === totalSpreads) {
                btnNext.disabled = true;
                btnNext.classList.add('disabled');
            } else {
                btnNext.disabled = false;
                btnNext.classList.remove('disabled');
            }
        }

        // C. Logic gáy sách & Chồng viền giấy lề trái (30px - 50px)
        // Khi đang ở Trang bìa đầu tiên (đôi trang 1: index 0, 1):
        // Trang bên trái là trong suốt (index 0) nên chưa có trang nào lật sang bên trái.
        if (pageStack) {
            if (currentSpread === 1) {
                pageStack.style.opacity = '0'; // Ẩn chồng giấy bên trái
            } else {
                pageStack.style.opacity = '0.9'; // Hiện chồng giấy tượng trưng các trang đã lật qua
            }
        }

        if (creaseOverlay) {
            if (currentSpread === 1) {
                // Dịch gáy sách lệch sang để chỉ tạo bóng đổ cho trang phải
                creaseOverlay.style.background = 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 48%, rgba(0,0,0,0.85) 49.5%, rgba(255,255,255,0.25) 50.5%, rgba(0,0,0,0.3) 53%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0) 100%)';
            } else {
                // Trả về gáy 3D đối xứng 2 bên mềm mại
                creaseOverlay.style.background = 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.04) 20%, rgba(0, 0, 0, 0.2) 40%, rgba(0, 0, 0, 0.55) 46%, rgba(0, 0, 0, 0.85) 49%, rgba(0, 0, 0, 0.95) 50%, rgba(255, 255, 255, 0.25) 51%, rgba(0, 0, 0, 0.4) 54%, rgba(0, 0, 0, 0.15) 65%, rgba(0, 0, 0, 0.02) 80%, rgba(0, 0, 0, 0) 100%)';
            }
        }

        // D. Khóa vuốt trang thừa ở trang đầu và trang cuối để tránh lỗi hiển thị trắng trang
        const pages = document.querySelectorAll('.page');
        if (pages.length > 0) {
            // Trang đầu tiên (index 0) luôn khóa pointer-events để tránh vuốt ngược ra trước bìa đầu
            if (pages[0]) pages[0].style.pointerEvents = 'none';
            
            // Trang cuối cùng (index 13) khóa pointer-events khi đang ở đôi trang cuối cùng để tránh vuốt tiếp
            const lastPageIdx = totalPages - 1;
            if (currentSpread === totalSpreads) {
                if (pages[lastPageIdx]) pages[lastPageIdx].style.pointerEvents = 'none';
            } else {
                if (pages[lastPageIdx]) pages[lastPageIdx].style.pointerEvents = 'auto';
            }
        }
    }

    // ==========================================================================
    // 4. KHỞI TẠO THƯ VIỆN ST.PAGEFLIP TỪ HTML TĨNH
    // ==========================================================================
    function initPageFlip() {
        if (!bookEl) return;

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

        // Nạp nội dung từ các div .page có sẵn trong HTML tĩnh giúp tải trang cực kỳ nhanh
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        // Cập nhật trạng thái ban đầu
        updateSpineAndUI(0);

        // Đăng ký các sự kiện lật trang
        pageFlip.on('flip', (e) => {
            updateSpineAndUI(e.data);
        });

        pageFlip.on('changeState', (e) => {
            // Khi đang lật hoặc kéo, gáy sách hơi mờ đi để tạo cảm giác tự nhiên 3D
            if (creaseOverlay) {
                if (e.data === 'page_flip' || e.data === 'user_fold') {
                    creaseOverlay.style.opacity = '0.5';
                } else {
                    creaseOverlay.style.opacity = '0.85';
                }
            }
        });
    }

    // Khởi tạo sách lật trực tiếp lập tức
    initPageFlip();

    // ==========================================================================
    // 5. ĐĂNG KÝ SỰ KIỆN CLICK NÚT MŨI TÊN ĐIỀU HƯỚNG VỚI CƠ CHẾ CHỐNG XUNG ĐỘT
    // ==========================================================================
    let isFlipping = false; // Cờ theo dõi trạng thái lật trang chủ động từ nút bấm

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (pageFlip && !isFlipping) {
                const currentIdx = pageFlip.getCurrentPageIndex();
                const currentSpread = Math.floor(currentIdx / 2) + 1;
                if (currentSpread > 1) {
                    isFlipping = true;
                    const targetIdx = (currentSpread - 2) * 2;
                    pageFlip.flip(targetIdx);
                    
                    // Giải phóng cờ lật sau 350ms (flippingTime = 300ms + 50ms buffer)
                    // Hoàn toàn không phụ thuộc vào trạng thái getState() của thư viện giúp nút bấm không bao giờ bị liệt
                    setTimeout(() => {
                        isFlipping = false;
                    }, 350);
                }
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (pageFlip && !isFlipping) {
                const currentIdx = pageFlip.getCurrentPageIndex();
                const totalPages = pageFlip.getPageCount();
                const totalSpreads = Math.ceil(totalPages / 2);
                const currentSpread = Math.floor(currentIdx / 2) + 1;
                if (currentSpread < totalSpreads) {
                    isFlipping = true;
                    const targetIdx = currentSpread * 2;
                    pageFlip.flip(targetIdx);
                    
                    // Giải phóng cờ lật sau 350ms
                    setTimeout(() => {
                        isFlipping = false;
                    }, 350);
                }
            }
        });
    }

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

    // ==========================================================================
    // 7. KHÓA HOÀN TOÀN CÁC THAO TÁC CUỘN & THU PHÓNG (PINCH TO ZOOM) BẰNG JS
    // ==========================================================================
    // Ngăn chặn pinch-to-zoom (thu phóng hai ngón tay) trên toàn giao diện
    document.addEventListener('touchstart', (event) => {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });

    // Ngăn chặn double-tap (nhấp đúp màn hình) tự động thu phóng trên một số dòng mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // Ngăn chặn cử chỉ zoom đặc thù trên iOS Safari
    document.addEventListener('gesturestart', (event) => {
        event.preventDefault();
    });

});