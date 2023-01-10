<script>
    import Header from './Header.svelte';
    import './styles.css';
</script>

<div class="app">
    <Header />

    <main>
        <slot />
    </main>

    <footer>
        <p>© OPAQUE</p>
    </footer>
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    main {
        display: flex;
        flex-direction: column;
        width: 100vw;
        margin: 0 auto;
        padding: 0 28px;
        box-sizing: border-box;
    }

    footer {
        font-size: 12px;
        display: flex;
        flex: 1;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-end;
        padding: 28px;
    }

    @media (max-width: 1280px) {
        main {
            width: 90%;
        }
    }

    @media (max-width: 768px) {
        h1 {
            font-size: 2.4rem;
        }

        main {
            width: 90%;
        }
    }

    @media (max-width: 480px) {
        main {
            width: 90%;
        }
    }
</style>
