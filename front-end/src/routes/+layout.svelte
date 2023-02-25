<script>
    import Header from './Header.svelte';
    import Footer from './Footer.svelte';
    import './styles.css';
</script>

<div class="app">
    <Header />

    <main>
        <slot />
    </main>

    <Footer />
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    main {
        display: flex;
        flex: 1;
        flex-direction: column;
        justify-content: space-between;
        width: 100vw;
        margin: 0 auto;
        margin-top: 5vh;
        padding: 0 28px;
    }

    @media (max-width: 1920px) {
        main {
            width: 100%;
        }
    }

    @media (max-width: 1280px) {
        main {
            width: 100%;
        }
    }

    @media (max-width: 768px) {
        h1 {
            font-size: 2.4rem;
        }

        main {
            width: 100%;
        }
    }

    @media (max-width: 480px) {
        main {
            width: 100%;
        }
    }
</style>
