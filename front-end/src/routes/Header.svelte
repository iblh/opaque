<script>
    import { page } from '$app/stores';
    import logo from '$lib/images/favicon-32x32.png';
    import github from '$lib/images/github.svg';
</script>

<header>
    <div id="logo">
        <!-- <img src={logo} alt="logo" /> -->
        OPAQUE
    </div>

    <!-- <nav>
        <ul>
            <li aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
                <a href="/">Home</a>
            </li>
            <li aria-current={$page.url.pathname === '/about' ? 'page' : undefined}>
                <a href="/about">About</a>
            </li>
        </ul>
    </nav> -->
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
    }
</style>
