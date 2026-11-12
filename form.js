// Не зависит от 3D-сцены: работает, даже если three.js не загрузился
// Форма заявки → открывает WhatsApp с готовым сообщением
document.getElementById('leadForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const lines = [
    'Здравствуйте! Заявка с сайта Hydroline Engineering.',
    `Имя: ${f.get('name')}`,
    `Телефон: ${f.get('phone')}`,
    `Объект: ${f.get('type')}`,
    f.get('area') && `Площадь: ${f.get('area')} м²`,
    f.get('msg') && `Комментарий: ${f.get('msg')}`,
  ].filter(Boolean);
  window.open(`https://wa.me/77011118162?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  document.getElementById('formNote').textContent = 'Открываем WhatsApp — отправьте сообщение, и мы ответим.';
});
