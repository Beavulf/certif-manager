'use client'

import { Button } from "@/components/ui/button";
import { useGetCertificates, useGetCertificatesAll } from "@/hooks/use-certificate";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/server/actions/graphql-action";
import uploadCertificateToEmployeeAction from "@/server/actions/certificate/upload-certificate-action";

export default function MyForm() {
  // const {data: allCertData} = useGetCertificatesAll();
  const {data, mutate, isPending} = useGetCertificates();
  console.log(allCertData);
  
  const handleGetCertificates = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    await mutate({})
    
    // console.log(data);
  }

    const handleDownloadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const id = "13b8388e-8f4e-49cd-acbd-7ecc25790da8"
      const res = await fetch(`/api/certificates/${id}`, {
        method: "GET",
      });
      
      const data = await res.json();
      window.location.href = data      
      console.log(data);
    }


    const handleCreateEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);
      
      const res = await fetch(`/api/employee/`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      console.log(data);
    }

    const handleAuth = async () => {
      const token = await getAuthToken("beavulf","Gjnjvexnjvjue1~~~~");
      if (!token.success) {
        console.log(token.error);
        return;
      }
      if (!token.data) {
        return;
      }
      authUser(token.data);
      const username = getUsername();
      console.log(username);
    }
  
    return (
      <div>
        <form name="add-employee" className="font-geist-mono" onSubmit={handleCreateEmployee} encType="multipart/form-data">
          <input name="fullName" type="text" placeholder="FULL NAME" />
          <input name="email" type="email" placeholder="Email" />
          <input name="adUsername" placeholder="AD NAME" />
          {/* <input name="file" type="file" /> */}
          <button type="submit" className="">Отправить</button>
        </form>

        <form
          name="load-certificate"
          className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md max-w-md mx-auto border border-gray-200"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          <span className="text-xl font-semibold text-gray-900 mb-2 tracking-wide">
            LOAD CERTIFICATE
          </span>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Employee ID
            <input
              name="employeeId"
              type="text"
              placeholder="Enter Employee ID"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
            Certificate File
            <input
              name="file"
              type="file"
              className={cn(
                "block w-full text-sm text-gray-700 focus:outline-none " +
                "file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 " +
                "file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-800 " +
                "hover:file:bg-amber-100"
              )}
         
              required
            />
          </label>
          <button
            type="submit"
            className="mt-4 bg-amber-400 text-white font-semibold py-2 rounded shadow hover:bg-amber-500 transition cursor-pointer"
          >
            Отправить
          </button>
        </form>
 
        <br/>
        <form name="download-certificate" className="font-geist-mono" onSubmit={handleDownloadSubmit} encType="multipart/form-data">
          <span>DOWNLOAD | </span>
          <button type="submit" className="bg-amber-200 border-2 cursor-pointer">DOWNLOAD</button>
        </form>
        <br />
        <form name="get-certificate" onSubmit={handleGetCertificates}>
          <label className="flex flex-col gap-1 text-gray-700 font-medium">
              Идентификатор сертификата
              <input
                name="employeeId"
                type="text"
                placeholder="Enter identify"
                className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
                required
              />
            </label>
            <Button
              type="submit"
              className="w-full mt-4 bg-amber-400 text-white font-semibold py-2 rounded shadow hover:bg-amber-500 transition cursor-pointer"
            >
              Получить
            </Button>
        </form>
      </div>
    );
  }