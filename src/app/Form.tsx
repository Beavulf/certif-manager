'use client'
export default function MyForm() {
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
  
      const form = e.currentTarget;
      const formData = new FormData(form);
  
      const res = await fetch("/api/certificates", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      console.log(data);
    };
  
    return (
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input name="title" type="text" placeholder="Заголовок" />
        <input name="description" type="text" placeholder="Описание" />
        <input name="file" type="file" />
        <button type="submit">Отправить</button>
      </form>
    );
  }