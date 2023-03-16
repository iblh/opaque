<script>
    // @ts-nocheck

    export let tree;
</script>

<div class="trunk">
    {#each tree.branches as branch}
        <div class="branch b-server">
            <div class="branch-icon">
                {@html branch.icon}
            </div>
            <div class="branch-info">
                <div class="branch-name">
                    {branch.name}
                </div>

                <div class="branch-url">
                    <!-- remove protocol -->
                    {branch.url.replace(/(^\w+:|^)\/\//, '')}
                </div>
            </div>
        </div>
    {/each}
</div>
