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
        const remember = data.get('remember');

        if (!username || !password) {
            error = 'username and password are required';
            return;
        }

        let expires_in = '3d';
        let expires_time = new Date(Date.now() + 3 * 86400 * 1000).toUTCString();

        if (remember) {
            expires_in = '90d';
            expires_time = new Date(Date.now() + 90 * 86400 * 1000).toUTCString();
        }

        const res = await fetch(`/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                password,
                expires_in,
            }),
        });

        const { jwt_token, ...result } = await res.json();

        if (res.status === 200) {
            // re-run all `load` functions, following the successful update
            await invalidateAll();

            // store the JWT token in cookie
            document.cookie = `jwt_token=${jwt_token}; expires=${expires_time}; path=/`;

            goto('/');
        } else {
            error = result.error;
        }

        applyAction(result);
    }
</script>

<svelte:head>
    <title>login | OPAGUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="login">
    <!-- login form -->
    <form id="login-form" method="POST" on:submit|preventDefault={handleLogin}>
        <div class="form-group">
            <label for="username">username</label>
            <input
                id="username"
                name="username"
                type="text"
                spellcheck="false"
                autocomplete="off"
            />
        </div>
        <div class="form-group">
            <label for="password">password</label>
            <input id="password" name="password" type="password" />
        </div>

        <!-- remember me -->
        <div class="form-group">
            <label for="remember" class="noselect cursor-pointer">
                <input id="remember" name="remember" type="checkbox" />
                remember me
            </label>
        </div>

        <div class="form-group">
            <button type="submit">Log in</button>
        </div>

        {#if error}
            <div class="from-group">
                <div class="form-error">
                    {error}
                </div>
            </div>
        {/if}
    </form>
</div>

<style>
    #login {
        padding: 48px 0;
    }

    #login .form-group {
        display: flex;
        flex-direction: column;
        margin-bottom: 14px;
    }

    #login-form input[type='text'],
    #login-form input[type='password'] {
        all: unset;
        height: 30px;
        border-bottom: 1px solid var(--color-accent-1);
        width: 200px;
    }

    #login-form input[type='checkbox'] {
        height: 16px;
        width: 16px;
        margin: 0;
        margin-right: 10px;
        cursor: pointer;
    }

    #login-form input[type='checkbox']::after {
        content: '';
        display: inline-block;
        width: 100%;
        height: 100%;
        border: 1px solid var(--color-accent-1);
        background-color: var(--color-bg);
        box-shadow: inset 0px 0px 0px 2px var(--color-bg);
        visibility: visible;
    }

    #login-form input[type='checkbox']:checked::after {
        background-color: var(--color-accent-1);
    }

    #login-form label {
        display: flex;
        font-size: 14px;
        margin-bottom: 4px;
    }

    #login-form button {
        all: unset;
        height: 30px;
        border: 1px solid #ccc;
        width: 100px;
        text-align: center;
        cursor: pointer;
    }

    #login-form button:hover {
        background-color: var(--color-accent-1);
        color: var(--color-beige);
    }

    #login-form button:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-accent-1);
    }
</style>
