        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        function toggleSidebar() {
            const isClosed = sidebar.classList.contains('-translate-x-full');
            
            if (isClosed) {
                // Open Sidebar
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
                setTimeout(() => {
                    overlay.classList.remove('opacity-0');
                    overlay.classList.add('opacity-100');
                    overlay.classList.add('pointer-events-auto');
                }, 10);
            } else {
                // Close Sidebar
                sidebar.classList.add('-translate-x-full');
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
                overlay.classList.remove('pointer-events-auto');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                }, 300);
            }
        }

        // Close sidebar if user clicks on overlay
        overlay.addEventListener('click', toggleSidebar);