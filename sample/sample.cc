// ---------------------------------------------------------------------
//
// Copyright (C) 2022 by the deal.II authors
//
// This file is part of the deal.II library.
//
// The deal.II library is free software; you can use it, redistribute
// it, and/or modify it under the terms of the GNU Lesser General
// Public License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.
// The full text of the license can be found in the file LICENSE.md at
// the top level directory of deal.II.
//
// ---------------------------------------------------------------------

// Test DataOut::write_deal_II_intermediate_in_parallel() and
// DataOutReader::read_whole_parallel_file() with compression

#include <deal.II/base/mpi.h>
#include <deal.II/base/numbers.h>

#include <deal.II/dofs/dof_accessor.h>
#include <deal.II/dofs/dof_handler.h>
#include <deal.II/dofs/dof_tools.h>

#include <deal.II/fe/fe_q.h>

#include <deal.II/grid/filtered_iterator.h>
#include <deal.II/grid/grid_generator.h>
#include <deal.II/grid/tria.h>
#include <deal.II/grid/tria_iterator.h>

#include <deal.II/lac/vector.h>

#include <deal.II/numerics/data_out.h>

#include "structured.h"

using namespace dealii;

template <int dim>
class MyReader : public DataOutReader<dim, dim>
{
public:
  std::vector<DataInterpretation> datatypes;
  std::vector<std::string>        names;
  double                          radius = -1;

  // iterate through vertices in each patch, find min and max x,y,z components
  std::array<Point<3, double>, 2>
  approx_bounds()
  {
    std::array<double, 3> min = {1. / 1e-60, 1. / 1e-60, 1. / 1e-60};

    std::array<double, 3> max = {-1e60, -1e60, -1e60};
    for (const auto &patch : this->get_patches())
      {
        for (unsigned int k = 0; k < patch.vertices.size(); ++k)
          {
            Point<3, double> vertex = patch.vertices[k];
            for (int j = 0; j < 3; ++j)
              {
                if (vertex[j] < min[j])
                  {
                    min[j] = vertex[j];
                  }
                if (vertex[j] > max[j])
                  {
                    max[j] = vertex[j];
                  }
              }
          }
      }
    Point<3, double>                min_point(min[0], min[1], min[2]);
    Point<3, double>                max_point(max[0], max[1], max[2]);
    std::array<Point<3, double>, 2> bounds = {min_point, max_point};
    return bounds;
  }


  std::vector<std::string>
  get_names()
  {
    names = this->get_dataset_names();
    return names;
  }

  StructuredData
  write_to_vertex(const Point<3, double>            &min,
                  const Point<3, double>            &max,
                  const std::array<unsigned int, 3> &num_pts)
  {
    auto v                           = this->get_nonscalar_data_ranges();
    names                            = this->get_dataset_names();
    unsigned int      num_components = names.size();
    StructuredData    structured_data(min, max, num_pts, num_components);
    std::vector<bool> processed(num_components);


    for (unsigned int i = 0; i < num_components; ++i)
      {
        processed[i] = false;
      }

    for (unsigned int i = 0; i < v.size(); ++i)
      { // mark indices as processed. we process vector components first
        unsigned int idx1 = std::get<0>(v[i]);
        unsigned int idx2 = std::get<1>(v[i]);
        for (unsigned int j = idx1; j <= idx2; ++j)
          { // idx1 to idx2 are the vector components
            processed[j] = true;
            datatypes.push_back(DataInterpretation::component_is_vector);
          }
      }


    for (const auto &patch : this->get_patches())
      {
        for (unsigned int k = 0; k < patch.vertices.size(); ++k)
          {
            Point<3, double>    vertex = patch.vertices[k];
            std::vector<double> data;

            for (unsigned int i = 0; i < v.size(); ++i)
              {
                unsigned int idx1 = std::get<0>(v[i]);
                unsigned int idx2 = std::get<1>(v[i]);
                // j goes through the indices with vector data
                for (unsigned int j = idx1; j <= idx2; ++j)
                  {
                    data.push_back(patch.data(j, k));
                  }
              }
            for (unsigned int i = 0; i < patch.data.n_rows(); ++i)
              {
                if (!processed[i])
                  {
                    data.push_back(patch.data(i, k));
                  }
              }



            structured_data.splat(vertex, data, 3);
          }
      }
    for (unsigned int i = datatypes.size(); i < num_components; ++i)
      {
        datatypes.push_back(DataInterpretation::component_is_scalar);
      }
    std::vector<std::string> temp_name;
    for (unsigned int i = 0; i < num_components; ++i)
      {
        if (processed[i])
          {
            temp_name.push_back(names[i]);
          }
      }
    for (unsigned int i = 0; i < num_components; ++i)
      {
        if (!processed[i])
          {
            temp_name.push_back(names[i]);
          }
      }
    for (unsigned int i = 0; i < temp_name.size(); ++i)
      {
        names[i] = temp_name[i];
      }


    return structured_data;
  }
};


void
sample_structured(const std::string                 &myFile,
                  const std::string                 &outputName,
                  const Point<3, double>            &p1,
                  const Point<3, double>            &p2,
                  const std::array<unsigned int, 3> &pts_dir)
{
  // Read the data back in and dump it into the deallog:
  std::ifstream in(myFile);
  Assert(in, dealii::ExcIO());
  MyReader<3> reader;
  reader.read_whole_parallel_file(in);

  StructuredData                  s = reader.write_to_vertex(p1, p2, pts_dir);
  std::vector<DataInterpretation> d = reader.datatypes;

  Table<4, double> T = s.data;

  s.to_vtk(T, p1, p2, outputName, reader.datatypes, reader.names);
}



int
main(int argc, char *argv[])
{
  if (argc == 2)
    {
      std::string   infile = argv[1];
      MyReader<3>   reader;
      std::ifstream in(infile);
      reader.read_whole_parallel_file(in);
      std::vector<std::string>        names  = reader.get_names();
      std::array<Point<3, double>, 2> bounds = reader.approx_bounds();
      Point<3, double>                min    = bounds[0];
      Point<3, double>                max    = bounds[1];
      std::cout << "min_x = " << min[0] << " max_x = " << max[0] << "\n";
      std::cout << "min_y = " << min[1] << " max_y = " << max[1] << "\n";
      std::cout << "min_z = " << min[2] << " max_z = " << max[2] << "\n";


      std::cout << names.size() << " components with following names:\n";
      for (unsigned int i = 0; i < names.size(); ++i)
        {
          std::cout << names[i] << "\n";
        }
    }

  else if (argc == 12)
    {
      std::string                 infile  = argv[1];
      std::string                 outfile = argv[2];
      Point<3, double>            p1(std::stod(argv[3]),
                          std::stod(argv[5]),
                          std::stod(argv[7]));
      Point<3, double>            p2(std::stod(argv[4]),
                          std::stod(argv[6]),
                          std::stod(argv[8]));
      std::array<unsigned int, 3> pts_dir = {(unsigned int)std::stoi(argv[9]),
                                             (unsigned int)std::stoi(argv[10]),
                                             (unsigned int)std::stoi(argv[11])};

      sample_structured(infile, outfile, p1, p2, pts_dir);
    }


  else if (argc == 6)
    {
      std::string   infile  = argv[1];
      std::string   outfile = argv[2];
      MyReader<3>   reader;
      std::ifstream in(infile);
      reader.read_whole_parallel_file(in);
      std::array<Point<3, double>, 2> bounds;
      bounds = reader.approx_bounds();

      std::array<unsigned int, 3> pts_dir = {(unsigned int)std::stoi(argv[3]),
                                             (unsigned int)std::stoi(argv[4]),
                                             (unsigned int)std::stoi(argv[5])};


      sample_structured(infile, outfile, bounds[0], bounds[1], pts_dir);
    }
  else
    {
      std::cout
        << "\nUnacceptable number of arguments \n To see data fields and approximate bounds, run ./sample <infile>. \n To sample from detected bounds, run "
           "./sample <infile> <outfile> <nx> <ny> <nz>\n Otherwise, run ./sample <infile> <outfile> <min x> <max x> <min y> <max y> <min z> <max z> <nx> <ny> <nz>";
    }
}
