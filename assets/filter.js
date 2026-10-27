const filterArea = document.querySelector('[data-topic-filter]');

if (filterArea) {
  const bar = filterArea.querySelector('.filter-bar');
  const buttons = [...bar.querySelectorAll('button')];
  const posts = [...filterArea.querySelectorAll('.post-row')];
  const count = filterArea.querySelector('.post-count');
  const empty = filterArea.querySelector('.empty-state');

  function selectTopic(topic) {
    let visible = 0;
    posts.forEach(post => {
      post.hidden = topic !== 'all' && post.dataset.topic !== topic;
      if (!post.hidden) visible++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === topic)));
    count.textContent = `${visible}개`;
    empty.hidden = visible > 0;
  }

  buttons.forEach(button => button.addEventListener('click', () => selectTopic(button.dataset.filter)));
  selectTopic('all');
  bar.hidden = false;
}
