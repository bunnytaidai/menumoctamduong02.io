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
        // Chiều cao book lấy khoảng 98% chiều cao của Frame 4 để tối ưu hóa không gian hiển thị tối đa
        const frameHeight = contentFrame.clientHeight;
        pageHeight = Math.floor(frameHeight * 0.98);
        
        // Nới rộng giới hạn chiều cao tối đa lên 850px để sách hiển thị to rõ rực rỡ hơn trên Desktop lớn
        if (pageHeight > 850) pageHeight = 850;
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
    // 2. KHỞI TẠO THƯ VIỆN ST.PAGEFLIP TỪ HTML TĨNH
    // ==========================================================================
    let pageFlip = null;

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

        // Nạp nội dung từ các div .page có sẵn trong HTML tĩnh giúp tải trang cực kỳ nhanh
        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        // Cập nhật trạng thái ban đầu
        updateSpineAndUI();

        // Đăng ký các sự kiện lật trang
        pageFlip.on('flip', (e) => {
            updateSpineAndUI();
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

    // Khởi tạo sách lật trực tiếp lập tức
    initPageFlip();

    // ==========================================================================
    // 3. LOGIC XỬ LÝ GÁY SÁCH 3D & CHỈ MỤC & ĐIỀU HƯỚNG
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