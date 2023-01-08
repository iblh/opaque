<script>
    // @ts-nocheck
    import { goto, invalidateAll } from '$app/navigation';
    import { enhance, applyAction, deserialize } from '$app/forms';

    /** @type {any} */
    let error;

    async function handleLogin(event) {
        const data = new FormData(this);
        const username = data.get('username');
        const password = data.get('password');

        const res = await fetch(`/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
            }),
        });

        const { jwt_token, ...result } = await res.json();

        if (res.status === 200) {
            // re-run all `load` functions, following the successful update
            await invalidateAll();
            // store the JWT token in cookie
            document.cookie = `jwt_token=${jwt_token}; path=/;`;
            goto('/');
        } else {
            error = result.error;
        }

        applyAction(result);
    }
</script>

<svelte:head>
    <title>login | OPAQUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="login">
    <!-- login form -->
    <form id="login-form" method="POST" on:submit|preventDefault={handleLogin}>
        <div class="form-group">
            <label for="username">Username</label>
            <input id="username" name="username" type="text" placeholder="username" />
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" placeholder="password" />
        </div>
        <div class="form-group">
            <button type="submit">Log in</button>
        </div>

        {#if error}
            <div class="form-error">
                {error}
            </div>
        {/if}
    </form>
</div>
